import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const [email, password] = process.argv.slice(2);
if (!email || !password) throw new Error('Usage: node scripts/create-admin.js email mot-de-passe');
const hash = await bcrypt.hash(password, 12);
await pool.query('INSERT INTO admins (email, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)', [email, hash]);
await pool.end();
console.log(`Administrateur créé: ${email}`);
