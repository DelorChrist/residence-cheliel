import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import 'dotenv/config';

const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.resolve(here, '..', process.env.UPLOAD_DIR || 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

app.disable('x-powered-by');

// Limiteur de débit en mémoire (zéro dépendance externe pour compatibilité totale Passenger/cPanel)
function createRateLimiter({ windowMs, max, message }) {
  const hits = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of hits.entries()) {
      if (now > data.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.min(windowMs, 5 * 60 * 1000));
  if (cleanup.unref) cleanup.unref();

  return (req, res, next) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) ||
               req.socket?.remoteAddress ||
               'unknown';
    const now = Date.now();
    let record = hits.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(ip, record);
      return next();
    }

    record.count += 1;
    if (record.count > max) {
      return res.status(429).json(message);
    }
    next();
  };
}

// Limiteur global sur l'API (protection anti-DoS suite à désactivation WAF)
const apiGlobalLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: { error: 'Trop de requêtes. Veuillez ralentir.' },
});

// Limiteur strict sur le login administrateur (anti force brute)
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});

// Limiteur sur la création de réservations
const reservationsLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Limite de requêtes atteinte. Veuillez patienter.' },
});

// Limiteur sur la recherche publique
const searchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  message: { error: 'Trop de requêtes. Veuillez patienter un instant.' },
});

app.use(helmet());
app.use('/api/', apiGlobalLimiter);

// CORS strict avec liste blanche explicite
const allowedOrigins = [
  'https://residencescheliel.com',
  'https://www.residencescheliel.com',
  'http://localhost:5173',
  'http://localhost:3000'
];
if (process.env.FRONTEND_ORIGIN) {
  for (const o of process.env.FRONTEND_ORIGIN.split(',')) {
    const trimmed = o.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origine non autorisée par la politique CORS.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Authorization', 'X-Access-Token', 'http_authorization'],
  credentials: true,
  maxAge: 600,
}));

app.use(express.json({ limit: '50kb' }));
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(uploadDir));

const tokenFor = admin => jwt.sign(
  { sub: admin.id, email: admin.email, role: 'admin' },
  process.env.JWT_SECRET,
  { expiresIn: '2h', algorithm: 'HS256' }
);

const auth = async (req, res, next) => {
  try {
    const raw =
      req.headers.authorization ||
      req.headers['x-authorization'] ||
      req.headers['http_authorization'] ||
      (req.headers['x-access-token'] ? `Bearer ${req.headers['x-access-token']}` : '') ||
      '';
    const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
    if (!token) {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (payload.role !== 'admin') {
      return res.status(401).json({ error: 'Non autorisé' });
    }
    const [rows] = await pool.query('SELECT id, email FROM admins WHERE id = ?', [payload.sub]);
    if (!rows[0]) return res.status(401).json({ error: 'Non autorisé' });
    req.admin = rows[0];
    next();
  } catch (err) {
    res.status(401).json({ error: 'Non autorisé' });
  }
};


const parseArrayValue = value => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [String(parsed)];
  } catch {
    return value.split(',').map(item => item.trim()).filter(Boolean);
  }
};

const toRoom = row => ({ ...row, amenities: parseArrayValue(row.amenities), images: parseArrayValue(row.images) });
const toReservation = row => ({
  id: row.id, client_name: row.client_name, phone: row.phone, email: row.email,
  room_id: row.room_id, stay_type: row.stay_type, check_in: row.check_in,
  check_out: row.check_out, remarks: row.remarks, payment_method: row.payment_method,
  status: row.status, created_at: row.created_at,
});
const createReservationId = () => `RES-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const handleLogin = async (req, res) => {
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';
    if (!email || !password) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }
    const [rows] = await pool.query('SELECT id, email, password_hash FROM admins WHERE LOWER(TRIM(email)) = ?', [email]);
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }
    const token = tokenFor(rows[0]);
    res.json({ token, admin: { id: rows[0].id, email: rows[0].email } });
  } catch (err) {
    console.error('[LOGIN ERROR]:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
};

app.post('/api/auth/login', loginLimiter, handleLogin);
app.post('/api/admin/login', loginLimiter, handleLogin);

app.get('/api/rooms', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM rooms ORDER BY name');
  res.json(rows.map(toRoom));
});

app.get('/api/rooms/available', async (req, res) => {
  const { roomId, checkIn, checkOut } = req.query;
  const [rows] = await pool.query(`SELECT NOT EXISTS (
    SELECT 1 FROM reservations WHERE room_id = ? AND status <> 'Annulé'
    AND check_in < ? AND check_out > ?
  ) AS available`, [roomId, checkOut || checkIn, checkIn]);
  res.json({ available: Boolean(rows[0]?.available) });
});

app.get('/api/rooms/available/list', async (req, res) => {
  const { checkIn, checkOut } = req.query;
  const [rows] = await pool.query(`SELECT rm.id AS room_id FROM rooms rm WHERE NOT EXISTS (
    SELECT 1 FROM reservations r WHERE r.room_id = rm.id AND r.status <> 'Annulé'
    AND r.check_in < ? AND r.check_out > ?
  ) ORDER BY rm.name`, [checkOut || checkIn, checkIn]);
  res.json(rows);
});

app.post('/api/reservations', reservationsLimiter, async (req, res) => {
  const { clientName, phone, email, roomId, stayType, checkIn, checkOut, remarks, paymentMethod } = req.body || {};
  if (!clientName || !phone || !roomId || !checkIn || !checkOut || !email) return res.status(400).json({ error: 'Informations de réservation incomplètes.' });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [conflicts] = await connection.query(`SELECT id FROM reservations WHERE room_id = ? AND status <> 'Annulé' AND check_in < ? AND check_out > ? FOR UPDATE`, [roomId, checkOut, checkIn]);
    if (conflicts.length) return res.status(409).json({ error: 'Cette chambre est déjà occupée sur cette période.' });
    const id = createReservationId();
    await connection.query(`INSERT INTO reservations (id, client_name, phone, email, room_id, stay_type, check_in, check_out, remarks, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, clientName, phone, email, roomId, stayType || 'nuitée', checkIn, checkOut, remarks || null, paymentMethod]);
    await connection.commit();
    res.status(201).json({ id });
  } catch (error) { await connection.rollback(); res.status(500).json({ error: 'Impossible d’enregistrer la réservation.' }); }
  finally { connection.release(); }
});

app.get('/api/reservations/search', searchLimiter, async (req, res) => {
  const rawQuery = String(req.query.query || '').trim();
  const query = rawQuery.replace(/[\s().-]/g, '');
  // Sécurité anti-fuite PII : recherche vide interdite
  if (!query || query.length < 3) {
    return res.json([]);
  }
  const [rows] = await pool.query(
    'SELECT * FROM reservations WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, \' \', \'\'), \'-\', \'\'), \'.\', \'\'), \')\', \'\') LIKE ? OR id = ? ORDER BY created_at DESC LIMIT 25',
    [`%${query}%`, rawQuery]
  );
  res.json(rows.map(toReservation));
});

app.get('/api/admin/reservations', auth, async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM reservations ORDER BY created_at DESC');
  res.json(rows.map(toReservation));
});
app.patch('/api/admin/reservations/:id', auth, async (req, res) => {
  try {
    const [oldRows] = await pool.query('SELECT status FROM reservations WHERE id = ?', [req.params.id]);
    await pool.query('UPDATE reservations SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    if (oldRows[0]) {
      await pool.query(
        'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.admin?.id || null,
          'UPDATE',
          'reservations',
          req.params.id,
          JSON.stringify({ status: oldRows[0].status }),
          JSON.stringify({ status: req.body.status }),
        ]
      ).catch(err => console.error('[AUDIT UPDATE ERROR]:', err.message));
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[RESERVATION UPDATE ERROR]:', err.message);
    res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
  }
});
app.delete('/api/admin/reservations/:id', auth, async (req, res) => {
  try {
    const [oldRows] = await pool.query('SELECT * FROM reservations WHERE id = ?', [req.params.id]);
    await pool.query('DELETE FROM reservations WHERE id = ?', [req.params.id]);
    if (oldRows[0]) {
      await pool.query(
        'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.admin?.id || null,
          'DELETE',
          'reservations',
          req.params.id,
          JSON.stringify(oldRows[0]),
          null,
        ]
      ).catch(err => console.error('[AUDIT DELETE ERROR]:', err.message));
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[RESERVATION DELETE ERROR]:', err.message);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

app.get('/api/admin/audit-log', auth, async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 100');
    const formatted = rows.map(r => ({
      id: String(r.id),
      admin_id: r.admin_id ? String(r.admin_id) : null,
      action: r.action,
      table_name: r.table_name,
      record_id: String(r.record_id),
      old_data: typeof r.old_data === 'string' ? JSON.parse(r.old_data || 'null') : r.old_data,
      new_data: typeof r.new_data === 'string' ? JSON.parse(r.new_data || 'null') : r.new_data,
      created_at: r.created_at,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('[AUDIT LOG ERROR]:', err.message);
    res.status(500).json({ error: 'Erreur lors du chargement du journal d’audit.' });
  }
});

app.get('/api/admin/gallery', auth, async (_req, res) => { const [rows] = await pool.query('SELECT * FROM gallery ORDER BY created_at DESC'); res.json(rows); });

// Sécurité Upload : liste blanche stricte d'extensions et de types MIME
const ALLOWED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.has(ext) || !ALLOWED_MIMES.has(file.mimetype)) {
      return cb(new Error('Format de fichier non autorisé. Seules les images sont acceptées.'));
    }
    cb(null, true);
  }
});

app.post('/api/admin/gallery/upload', auth, upload.array('files', 20), async (req, res) => {
  const results = [];
  for (const file of req.files || []) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTS.has(extension)) {
      fs.rmSync(file.path, { force: true });
      continue;
    }
    const storagePath = `${file.filename}${extension}`;
    const finalPath = path.join(uploadDir, storagePath);
    fs.renameSync(file.path, finalPath);
    const url = `${process.env.PUBLIC_API_URL || ''}/uploads/${storagePath}`;
    results.push({ url, name: file.originalname, storage_path: storagePath });
  }
  res.status(201).json(results);
});
app.post('/api/admin/gallery', auth, async (req, res) => {
  const { url, name } = req.body || {};
  if (!url || !name) return res.status(400).json({ error: 'Image invalide.' });
  const storagePath = url.split('/uploads/')[1] || url;
  const id = crypto.randomUUID();
  await pool.query('INSERT INTO gallery (id, url, name, storage_path) VALUES (?, ?, ?, ?)', [id, url, name, storagePath]);
  res.status(201).json({ id, url, name });
});
app.delete('/api/admin/gallery/:id', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT storage_path, url FROM gallery WHERE id = ?', [req.params.id]);
  if (rows[0]) {
    const [used] = await pool.query('SELECT id FROM rooms WHERE image_principale = ? OR JSON_CONTAINS(images, ?)', [rows[0].url, JSON.stringify(rows[0].url)]);
    if (!used.length) fs.rmSync(path.join(uploadDir, rows[0].storage_path), { force: true });
    await pool.query('DELETE FROM gallery WHERE id = ?', [req.params.id]);
  }
  res.json({ ok: true });
});

app.get('/api/admin/rooms', auth, async (_req, res) => { const [rows] = await pool.query('SELECT * FROM rooms ORDER BY name'); res.json(rows.map(toRoom)); });
app.post('/api/admin/rooms', auth, async (req, res) => { const room = req.body; await pool.query('INSERT INTO rooms SET ?', { ...room, amenities: JSON.stringify(room.amenities || []), images: JSON.stringify(room.images || []) }); res.status(201).json({ ok: true }); });
app.put('/api/admin/rooms/:id', auth, async (req, res) => { const room = req.body; await pool.query('UPDATE rooms SET ? WHERE id = ?', [{ ...room, amenities: JSON.stringify(room.amenities || []), images: JSON.stringify(room.images || []) }, req.params.id]); res.json({ ok: true }); });
app.delete('/api/admin/rooms/:id', auth, async (req, res) => { await pool.query('DELETE FROM rooms WHERE id = ?', [req.params.id]); res.json({ ok: true }); });

app.use((error, _req, res, _next) => {
  console.error('[GLOBAL ERROR]', error);
  const status = error.status || 500;
  const message = status === 400 ? error.message : (status === 401 ? 'Non autorisé' : (status === 403 ? 'Accès refusé' : 'Erreur interne'));
  res.status(status).json({ error: message });
});
export default app;
