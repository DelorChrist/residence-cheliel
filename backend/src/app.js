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

export const DEFAULT_ROOM_AMENITIES = [
  'Climatisation',
  'Wifi',
  'Canal',
  'Cuisine équipée',
  'Eau chaude',
];

const getDefaultAmenities = async () => {
  try {
    const [rows] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'default_amenities'");
    if (rows && rows[0]?.value) {
      const parsed = JSON.parse(rows[0].value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_ROOM_AMENITIES;
};

export const DEFAULT_CADRE_CONFIG = {
  title: 'Notre cadre',
  badge: "L'OASIS DE YAMOUSSOUKRO",
  subtitle: "Reconnue pour sa piscine d'exception — parmi les plus belles et prisées de Yamoussoukro —, la Résidence Chéliel vous plonge dans une atmosphère de sérénité absolue, de fraîcheur et d'élégance tropicale.",
  bannerUrl: '/images/piscine/longue_banniere.jpg',
  items: [
    {
      id: 'cadre-1',
      type: 'image',
      url: '/images/piscine/longue_banniere.jpg',
      title: 'Piscine & Transats d’Exception',
      subtitle: 'Grand bassin turquoise avec parasols et bains de soleil sous le ciel azur de Yamoussoukro',
      tag: 'Piscine Principale',
      featured: true,
    },
    {
      id: 'cadre-2',
      type: 'video',
      url: '/images/piscine/WhatsApp Video 2026-10-19 at 20.58.21.mp4',
      title: 'Visite immersive de la piscine',
      subtitle: 'Découvrez en vidéo la fraîcheur et le calme de notre espace aquatique',
      tag: 'Visite Vidéo',
      featured: true,
    },
    {
      id: 'cadre-3',
      type: 'image',
      url: '/images/piscine.jpg',
      title: 'Bains de Soleil & Détente',
      subtitle: 'Transats confortables et parasols pour profiter de la douceur du climat',
      tag: 'Bains de soleil',
      featured: false,
    },
    {
      id: 'cadre-4',
      type: 'image',
      url: '/images/bar.jpeg',
      title: 'Bar Lounge & Cocktails',
      subtitle: 'Rafraîchissements et cocktails servis directement au bord du bassin',
      tag: 'Bar au bord de l’eau',
      featured: false,
    },
  ],
};

const getCadreConfig = async () => {
  try {
    const [rows] = await pool.query("SELECT `value` FROM settings WHERE `key` = 'cadre_content'");
    if (rows && rows[0]?.value) {
      const parsed = JSON.parse(rows[0].value);
      if (parsed && typeof parsed === 'object') {
        const result = { ...DEFAULT_CADRE_CONFIG, ...parsed };
        if (!result.bannerUrl || result.bannerUrl === '/images/piscine_luxe.jpg' || result.bannerUrl === '/images/piscine/longue_banniere.png') {
          result.bannerUrl = '/images/piscine/longue_banniere.jpg';
        }
        return result;
      }
    }
  } catch {}
  return DEFAULT_CADRE_CONFIG;
};

// Migration automatique au démarrage pour garantir les colonnes et tables nécessaires
(async () => {
  try {
    const [cols] = await pool.query('DESCRIBE rooms');
    if (Array.isArray(cols)) {
      if (!cols.some(c => c.Field === 'video_url')) {
        await pool.query("ALTER TABLE rooms ADD COLUMN video_url VARCHAR(500) NULL DEFAULT '' AFTER images");
        console.log('✅ [Auto-Migration] Colonne video_url ajoutée dans rooms.');
      }
      if (!cols.some(c => c.Field === 'video_urls')) {
        await pool.query("ALTER TABLE rooms ADD COLUMN video_urls JSON NULL AFTER video_url");
        console.log('✅ [Auto-Migration] Colonne video_urls ajoutée dans rooms.');
      }
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(64) PRIMARY KEY,
        \`value\` MEDIUMTEXT NOT NULL,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await pool.query('ALTER TABLE settings MODIFY COLUMN `value` MEDIUMTEXT NOT NULL').catch(() => {});
    await pool.query(`
      INSERT IGNORE INTO settings (\`key\`, \`value\`)
      VALUES ('default_amenities', ?)
    `, [JSON.stringify(DEFAULT_ROOM_AMENITIES)]);
    await pool.query(`
      INSERT IGNORE INTO settings (\`key\`, \`value\`)
      VALUES ('cadre_content', ?)
    `, [JSON.stringify(DEFAULT_CADRE_CONFIG)]);
  } catch (err) {
    console.warn('[Auto-Migration Warning]:', err.message);
  }
})();

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

// ─── Protection anti force-brute progressive sur le login administrateur ──────
// 3 tentatives échouées consécutives = 5 minutes d'attente.
// Pénalité progressive en cas de récidive : 10 min, 15 min... jusqu'à 60 min.
const loginAttempts = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of loginAttempts.entries()) {
    if (now > record.lockedUntil && record.failedAttempts === 0) {
      loginAttempts.delete(ip);
    }
  }
}, 10 * 60 * 1000).unref?.();

const checkLoginLockout = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record && now < record.lockedUntil) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    const timeText = remainingMinutes > 1 ? `${remainingMinutes} minutes` : `${remainingSeconds} seconde${remainingSeconds > 1 ? 's' : ''}`;
    return res.status(429).json({
      error: `Nombre maximal de tentatives atteint. Accès temporairement verrouillé. Veuillez patienter encore ${timeText} avant de réessayer.`,
      retryAfterSeconds: remainingSeconds
    });
  }
  next();
};

const recordLoginFailure = (ip) => {
  const now = Date.now();
  let record = loginAttempts.get(ip);
  if (!record) {
    record = { failedAttempts: 0, lockoutCount: 0, lockedUntil: 0 };
    loginAttempts.set(ip, record);
  }

  record.failedAttempts += 1;

  if (record.failedAttempts >= 3) {
    record.lockoutCount += 1;
    // 1er blocage = 5 minutes, 2ème = 10 minutes, 3ème = 15 minutes, etc. (plafonné à 60 minutes)
    const lockoutMinutes = Math.min(record.lockoutCount * 5, 60);
    record.lockedUntil = now + (lockoutMinutes * 60 * 1000);
    record.failedAttempts = 0;

    return {
      locked: true,
      lockoutMinutes,
      error: `Nombre maximal de tentatives atteint (3 échecs). Accès bloqué pendant ${lockoutMinutes} minutes.`
    };
  }

  const remaining = 3 - record.failedAttempts;
  return {
    locked: false,
    remaining,
    error: `Email ou mot de passe incorrect (${remaining} tentative${remaining > 1 ? 's' : ''} restante${remaining > 1 ? 's' : ''}).`
  };
};

const recordLoginSuccess = (ip) => {
  loginAttempts.delete(ip);
};

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

app.use(express.json({ limit: '2mb' }));
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  next();
}, express.static(uploadDir, {
  maxAge: '365d',
  immutable: true,
}));

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

const parseVideos = row => {
  if (Array.isArray(row.video_urls)) return row.video_urls.filter(Boolean);
  if (typeof row.video_urls === 'string') {
    try {
      const parsed = JSON.parse(row.video_urls);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
  }
  if (row.video_url) {
    try {
      const parsed = JSON.parse(row.video_url);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {}
    return row.video_url.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

const toRoom = row => {
  const videos = parseVideos(row);
  const parsedAmenities = parseArrayValue(row.amenities);
  return {
    ...row,
    amenities: parsedAmenities.length > 0 ? parsedAmenities : DEFAULT_ROOM_AMENITIES,
    images: parseArrayValue(row.images),
    video_url: videos[0] || row.video_url || '',
    video_urls: videos,
  };
};
const toReservation = row => ({
  id: row.id, client_name: row.client_name, phone: row.phone, email: row.email,
  room_id: row.room_id, stay_type: row.stay_type, check_in: row.check_in,
  check_out: row.check_out, remarks: row.remarks, payment_method: row.payment_method,
  status: row.status, created_at: row.created_at,
});
const createReservationId = () => `RES-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const handleLogin = async (req, res) => {
  const ip = getClientIp(req);
  try {
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';

    const failLogin = async () => {
      const failure = recordLoginFailure(ip);
      await pool.query(
        'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          null,
          failure.locked ? 'LOGIN_BLOCKED' : 'LOGIN_FAILED',
          'auth',
          ip,
          null,
          JSON.stringify({
            email: email || 'non renseigné',
            ip,
            attempt: failure.locked ? 3 : (3 - failure.remaining),
            lockoutMinutes: failure.lockoutMinutes || null
          })
        ]
      ).catch(e => console.error('[AUDIT LOGIN FAILURE ERROR]:', e.message));

      const status = failure.locked ? 429 : 401;
      return res.status(status).json({ error: failure.error });
    };

    if (!email || !password) {
      return await failLogin();
    }
    const [rows] = await pool.query('SELECT id, email, password_hash FROM admins WHERE LOWER(TRIM(email)) = ?', [email]);
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return await failLogin();
    }

    // Réinitialisation immédiate du compteur en cas de succès
    recordLoginSuccess(ip);

    const token = tokenFor(rows[0]);
    await pool.query(
      'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      [rows[0].id, 'LOGIN', 'auth', String(rows[0].id), null, JSON.stringify({ email: rows[0].email, ip })]
    ).catch(e => console.error('[AUDIT LOGIN ERROR]:', e.message));

    res.json({ token, admin: { id: rows[0].id, email: rows[0].email } });
  } catch (err) {
    console.error('[LOGIN ERROR]:', err);
    res.status(500).json({ error: 'Erreur interne' });
  }
};

app.post('/api/admin/logout', auth, async (req, res) => {
  const ip = getClientIp(req);
  try {
    await pool.query(
      'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      [req.admin.id, 'LOGOUT', 'auth', String(req.admin.id), null, JSON.stringify({ email: req.admin.email, ip })]
    ).catch(e => console.error('[AUDIT LOGOUT ERROR]:', e.message));
    res.json({ ok: true });
  } catch {
    res.json({ ok: true });
  }
});

app.post('/api/auth/login', checkLoginLockout, handleLogin);
app.post('/api/admin/login', checkLoginLockout, handleLogin);

app.get('/api/rooms', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM rooms ORDER BY name');
  res.json(rows.map(toRoom));
});

app.get('/api/amenities/default', async (_req, res) => {
  const list = await getDefaultAmenities();
  res.json(list);
});
app.get('/api/rooms/default-amenities', async (_req, res) => {
  const list = await getDefaultAmenities();
  res.json(list);
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
  const isResId = rawQuery.toUpperCase().startsWith('RES-');
  
  // Sécurité anti-fuite PII :
  // Si c'est un numéro de téléphone, exiger au minimum 8 chiffres pour empêcher le scraping / énumération par préfixe court
  if (!query || (!isResId && query.length < 8)) {
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
    const [oldRows] = await pool.query('SELECT status, client_name FROM reservations WHERE id = ?', [req.params.id]);
    await pool.query('UPDATE reservations SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
    if (oldRows[0]) {
      await pool.query(
        'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.admin?.id || null,
          'UPDATE',
          'reservations',
          req.params.id,
          JSON.stringify({ status: oldRows[0].status, client_name: oldRows[0].client_name }),
          JSON.stringify({ status: req.body.status, client_name: oldRows[0].client_name }),
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
    const [rows] = await pool.query(`
      SELECT a.*, adm.email AS admin_email 
      FROM audit_log a 
      LEFT JOIN admins adm ON a.admin_id = adm.id 
      ORDER BY a.created_at DESC 
      LIMIT 200
    `);
    const formatted = rows.map(r => ({
      id: String(r.id),
      admin_id: r.admin_id ? String(r.admin_id) : null,
      admin_email: r.admin_email || (r.admin_id ? `Admin #${r.admin_id}` : null),
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

// Sécurité Upload Vidéo : formats vidéo acceptés (.mp4, .webm, .mov, etc.) jusqu'à 120 Mo
const ALLOWED_VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogg']);
const uploadVideo = multer({
  dest: uploadDir,
  limits: { fileSize: 120 * 1024 * 1024 }, // 120MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_VIDEO_EXTS.has(ext)) {
      return cb(new Error('Format de vidéo non autorisé. Extensions acceptées : .mp4, .webm, .mov, .m4v, .ogg'));
    }
    cb(null, true);
  }
});

app.post('/api/admin/video/upload', auth, (req, res) => {
  uploadVideo.single('video')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Erreur lors de l’upload de la vidéo.' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier vidéo reçu.' });
    }
    const extension = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_VIDEO_EXTS.has(extension)) {
      fs.rmSync(req.file.path, { force: true });
      return res.status(400).json({ error: 'Format vidéo non autorisé.' });
    }
    const storagePath = `video-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`;
    const finalPath = path.join(uploadDir, storagePath);
    try {
      fs.renameSync(req.file.path, finalPath);
      const url = `${process.env.PUBLIC_API_URL || ''}/uploads/${storagePath}`;
      await pool.query(
        'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
        [req.admin.id, 'UPLOAD_VIDEO', 'rooms', storagePath, null, JSON.stringify({ name: req.file.originalname, size: req.file.size })]
      ).catch(e => console.error('[AUDIT VIDEO UPLOAD ERROR]:', e.message));

      res.status(201).json({ url, name: req.file.originalname, storage_path: storagePath });
    } catch (saveErr) {
      fs.rmSync(req.file.path, { force: true });
      console.error('[VIDEO SAVE ERROR]:', saveErr);
      res.status(500).json({ error: 'Erreur lors de l’enregistrement de la vidéo.' });
    }
  });
});

app.post('/api/admin/gallery', auth, async (req, res) => {
  const { url, name } = req.body || {};
  if (!url || !name) return res.status(400).json({ error: 'Image invalide.' });
  const storagePath = url.split('/uploads/')[1] || url;
  const id = crypto.randomUUID();
  await pool.query('INSERT INTO gallery (id, url, name, storage_path) VALUES (?, ?, ?, ?)', [id, url, name, storagePath]);
  await pool.query(
    'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
    [req.admin.id, 'INSERT', 'gallery', id, null, JSON.stringify({ name })]
  ).catch(e => console.error('[AUDIT GALLERY ERROR]:', e.message));
  res.status(201).json({ id, url, name });
});
app.delete('/api/admin/gallery/:id', auth, async (req, res) => {
  const [rows] = await pool.query('SELECT storage_path, url, name FROM gallery WHERE id = ?', [req.params.id]);
  if (rows[0]) {
    const [used] = await pool.query('SELECT id FROM rooms WHERE image_principale = ? OR JSON_CONTAINS(images, ?)', [rows[0].url, JSON.stringify(rows[0].url)]);
    if (!used.length) fs.rmSync(path.join(uploadDir, rows[0].storage_path), { force: true });
    await pool.query('DELETE FROM gallery WHERE id = ?', [req.params.id]);
    await pool.query(
      'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      [req.admin.id, 'DELETE', 'gallery', req.params.id, JSON.stringify({ name: rows[0].name }), null]
    ).catch(e => console.error('[AUDIT GALLERY ERROR]:', e.message));
  }
  res.json({ ok: true });
});

app.get('/api/admin/rooms', auth, async (_req, res) => { const [rows] = await pool.query('SELECT * FROM rooms ORDER BY name'); res.json(rows.map(toRoom)); });
app.post('/api/admin/rooms', auth, async (req, res) => {
  const room = req.body;
  const rawVideos = Array.isArray(room.video_urls)
    ? room.video_urls.filter(Boolean)
    : (room.video_url ? [room.video_url].filter(Boolean) : []);
  const rawAmenities = (Array.isArray(room.amenities) && room.amenities.length > 0)
    ? room.amenities
    : await getDefaultAmenities();
  await pool.query('INSERT INTO rooms SET ?', {
    ...room,
    amenities: JSON.stringify(rawAmenities),
    images: JSON.stringify(room.images || []),
    video_url: rawVideos[0] || room.video_url || '',
    video_urls: JSON.stringify(rawVideos),
  });
  await pool.query(
    'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
    [req.admin.id, 'INSERT', 'rooms', room.id || room.name, null, JSON.stringify({ name: room.name, price_night: room.price_night })]
  ).catch(e => console.error('[AUDIT ROOMS ERROR]:', e.message));
  res.status(201).json({ ok: true });
});
app.put('/api/admin/rooms/:id', auth, async (req, res) => {
  const room = req.body;
  const rawVideos = Array.isArray(room.video_urls)
    ? room.video_urls.filter(Boolean)
    : (room.video_url ? [room.video_url].filter(Boolean) : []);
  const [oldRows] = await pool.query('SELECT name FROM rooms WHERE id = ?', [req.params.id]);
  await pool.query('UPDATE rooms SET ? WHERE id = ?', [
    {
      ...room,
      amenities: JSON.stringify(room.amenities || []),
      images: JSON.stringify(room.images || []),
      video_url: rawVideos[0] || room.video_url || '',
      video_urls: JSON.stringify(rawVideos),
    },
    req.params.id
  ]);
  await pool.query(
    'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
    [req.admin.id, 'UPDATE', 'rooms', req.params.id, JSON.stringify({ name: oldRows[0]?.name }), JSON.stringify({ name: room.name })]
  ).catch(e => console.error('[AUDIT ROOMS ERROR]:', e.message));
  res.json({ ok: true });
});
app.delete('/api/admin/rooms/:id', auth, async (req, res) => {
  const [oldRows] = await pool.query('SELECT name FROM rooms WHERE id = ?', [req.params.id]);
  await pool.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
  await pool.query(
    'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
    [req.admin.id, 'DELETE', 'rooms', req.params.id, JSON.stringify({ name: oldRows[0]?.name }), null]
  ).catch(e => console.error('[AUDIT ROOMS ERROR]:', e.message));
  res.json({ ok: true });
});

// ─── Paramètres système & Gestion Comptes ─────────────────────────────────────

// 1. Liste des administrateurs
app.get('/api/admin/admins-list', auth, async (_req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, email, created_at FROM admins ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('[ADMINS LIST ERROR]:', err.message);
    res.status(500).json({ error: 'Impossible de récupérer la liste des administrateurs.' });
  }
});

// 2. Changer de mot de passe
app.post('/api/admin/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Le mot de passe actuel et le nouveau mot de passe sont requis.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
    }

    const [rows] = await pool.query('SELECT id, email, password_hash FROM admins WHERE id = ?', [req.admin.id]);
    if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admins SET password_hash = ? WHERE id = ?', [newHash, req.admin.id]);

    await pool.query(
      'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      [req.admin.id, 'CHANGE_PASSWORD', 'admins', String(req.admin.id), null, JSON.stringify({ email: req.admin.email })]
    ).catch(e => console.error('[AUDIT ERROR]:', e.message));

    res.json({ ok: true, message: 'Mot de passe modifié avec succès.' });
  } catch (err) {
    console.error('[CHANGE PASSWORD ERROR]:', err.message);
    res.status(500).json({ error: 'Erreur lors du changement de mot de passe.' });
  }
});

// 3. Créer un nouvel administrateur
app.post('/api/admin/create-admin', auth, async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Adresse email invalide.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 6 caractères.' });
    }

    const [existing] = await pool.query('SELECT id FROM admins WHERE LOWER(TRIM(email)) = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Un administrateur avec cette adresse email existe déjà.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO admins (email, password_hash) VALUES (?, ?)', [email, passwordHash]);

    await pool.query(
      'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      [req.admin.id, 'CREATE_ADMIN', 'admins', String(result.insertId), null, JSON.stringify({ email })]
    ).catch(e => console.error('[AUDIT ERROR]:', e.message));

    res.status(201).json({ ok: true, admin: { id: result.insertId, email } });
  } catch (err) {
    console.error('[CREATE ADMIN ERROR]:', err.message);
    res.status(500).json({ error: 'Erreur lors de la création de l’administrateur.' });
  }
});

// 4. Vider la base de données (sécurité stricte : mot de passe admin requis, JAMAIS admins ni audit_log)
app.post('/api/admin/reset-database', auth, async (req, res) => {
  const { password, confirmationText } = req.body || {};

  if (confirmationText !== 'VIDER') {
    return res.status(400).json({ error: 'Code de confirmation invalide. Accès refusé.' });
  }

  try {
    const [rows] = await pool.query('SELECT id, email, password_hash FROM admins WHERE id = ?', [req.admin.id]);
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Mot de passe administrateur incorrect. Action annulée.' });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      // On vide réservations, appartements et galerie
      await connection.query('DELETE FROM reservations');
      await connection.query('DELETE FROM gallery');
      await connection.query('DELETE FROM rooms');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      await connection.commit();

      // Nettoyage sécurisé des fichiers de galerie physiques téléversés
      try {
        const files = fs.readdirSync(uploadDir);
        for (const file of files) {
          const filePath = path.join(uploadDir, file);
          if (fs.statSync(filePath).isFile()) {
            fs.unlinkSync(filePath);
          }
        }
      } catch (fileErr) {
        console.warn('[RESET CLEANUP WARNING]:', fileErr.message);
      }
    } catch (dbErr) {
      await connection.rollback();
      await connection.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
      throw dbErr;
    } finally {
      connection.release();
    }

    // Le journal d'audit est conservé et enregistre la réinitialisation !
    await pool.query(
      'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.admin.id,
        'DATABASE_RESET',
        'DATABASE',
        'ALL',
        null,
        JSON.stringify({ reset_by: req.admin.email, at: new Date().toISOString() })
      ]
    ).catch(e => console.error('[AUDIT ERROR]:', e.message));

    res.json({ ok: true, message: 'La base de données a été vidée avec succès. Vos accès administrateur et le journal d’audit sont intacts.' });
  } catch (err) {
    console.error('[DATABASE RESET ERROR]:', err.message);
    res.status(500).json({ error: 'Erreur lors de la réinitialisation de la base de données.' });
  }
});

// 5. Informations système
app.get('/api/admin/system-info', auth, async (_req, res) => {
  try {
    const [[resCount]] = await pool.query('SELECT COUNT(*) AS total FROM reservations');
    const [[roomsCount]] = await pool.query('SELECT COUNT(*) AS total FROM rooms');
    const [[adminsCount]] = await pool.query('SELECT COUNT(*) AS total FROM admins');
    const [[auditCount]] = await pool.query('SELECT COUNT(*) AS total FROM audit_log');
    const [[galleryCount]] = await pool.query('SELECT COUNT(*) AS total FROM gallery');

    res.json({
      reservations: resCount?.total || 0,
      rooms: roomsCount?.total || 0,
      admins: adminsCount?.total || 0,
      auditLogs: auditCount?.total || 0,
      galleryImages: galleryCount?.total || 0,
      uptimeMinutes: Math.floor(process.uptime() / 60),
      dbStatus: 'Connectée',
      serverTime: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[SYSTEM INFO ERROR]:', err.message);
    res.status(500).json({ error: 'Impossible de charger les informations système.' });
  }
});

// 6. Gestion des équipements par défaut du système
app.get('/api/admin/settings/amenities', auth, async (_req, res) => {
  try {
    const list = await getDefaultAmenities();
    res.json({ amenities: list });
  } catch (err) {
    console.error('[GET DEFAULT AMENITIES ERROR]:', err.message);
    res.status(500).json({ error: 'Impossible de récupérer les équipements par défaut.' });
  }
});

app.put('/api/admin/settings/amenities', auth, async (req, res) => {
  try {
    const { amenities } = req.body || {};
    if (!Array.isArray(amenities)) {
      return res.status(400).json({ error: 'La liste des équipements par défaut doit être un tableau.' });
    }
    const cleaned = amenities.map(a => String(a).trim()).filter(Boolean);
    await pool.query(
      'INSERT INTO settings (`key`, `value`) VALUES (\'default_amenities\', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [JSON.stringify(cleaned)]
    );
    await pool.query(
      'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      [req.admin.id, 'UPDATE_SETTINGS', 'settings', 'default_amenities', null, JSON.stringify({ amenities: cleaned })]
    ).catch(e => console.error('[AUDIT SETTINGS ERROR]:', e.message));
    res.json({ ok: true, amenities: cleaned });
  } catch (err) {
    console.error('[UPDATE DEFAULT AMENITIES ERROR]:', err.message);
    res.status(500).json({ error: 'Impossible de mettre à jour les équipements par défaut.' });
  }
});

// 7. Gestion de "Notre cadre" (Piscine & Espaces de la résidence)
app.get('/api/cadre', async (_req, res) => {
  try {
    const config = await getCadreConfig();
    res.json(config);
  } catch (err) {
    console.error('[GET CADRE ERROR]:', err.message);
    res.status(500).json({ error: 'Impossible de récupérer les informations de notre cadre.' });
  }
});

app.get('/api/admin/cadre', auth, async (_req, res) => {
  try {
    const config = await getCadreConfig();
    res.json(config);
  } catch (err) {
    console.error('[GET ADMIN CADRE ERROR]:', err.message);
    res.status(500).json({ error: 'Erreur lors de la récupération du cadre.' });
  }
});

app.put('/api/admin/cadre', auth, async (req, res) => {
  try {
    const { title, badge, subtitle, bannerUrl, items } = req.body || {};
    const sanitized = {
      title: String(title || DEFAULT_CADRE_CONFIG.title).trim(),
      badge: String(badge || DEFAULT_CADRE_CONFIG.badge).trim(),
      subtitle: String(subtitle || DEFAULT_CADRE_CONFIG.subtitle).trim(),
      bannerUrl: String(bannerUrl || DEFAULT_CADRE_CONFIG.bannerUrl).trim(),
      items: Array.isArray(items)
        ? items.map((it, idx) => ({
            id: String(it.id || `cadre-${Date.now()}-${idx}`),
            type: it.type === 'video' ? 'video' : 'image',
            url: String(it.url || '').trim(),
            title: String(it.title || '').trim(),
            subtitle: String(it.subtitle || '').trim(),
            tag: String(it.tag || '').trim(),
            thumbnailUrl: String(it.thumbnailUrl || '').trim(),
            featured: Boolean(it.featured),
          })).filter(it => it.url.length > 0)
        : [],
    };

    await pool.query(
      "INSERT INTO settings (`key`, `value`) VALUES ('cadre_content', ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [JSON.stringify(sanitized)]
    );

    await pool.query(
      'INSERT INTO audit_log (admin_id, action, table_name, record_id, old_data, new_data) VALUES (?, ?, ?, ?, ?, ?)',
      [req.admin.id, 'UPDATE_SETTINGS', 'settings', 'cadre_content', null, JSON.stringify({ itemsCount: sanitized.items.length })]
    ).catch(e => console.error('[AUDIT CADRE ERROR]:', e.message));

    res.json({ ok: true, cadre: sanitized });
  } catch (err) {
    console.error('[UPDATE CADRE ERROR]:', err.message);
    res.status(500).json({ error: 'Impossible d’enregistrer les modifications de notre cadre.' });
  }
});

app.use((error, _req, res, _next) => {
  console.error('[GLOBAL ERROR]', error);
  const status = error.status || 500;
  const message = status === 400 ? error.message : (status === 401 ? 'Non autorisé' : (status === 403 ? 'Accès refusé' : 'Erreur interne'));
  res.status(status).json({ error: message });
});
export default app;
