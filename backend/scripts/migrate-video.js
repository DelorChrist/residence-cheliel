import { pool } from '../src/db.js';

async function migrate() {
  try {
    const [cols] = await pool.query('DESCRIBE rooms');
    const hasCol = cols.some(c => c.Field === 'video_url');
    if (!hasCol) {
      await pool.query("ALTER TABLE rooms ADD COLUMN video_url VARCHAR(500) NULL DEFAULT '' AFTER images");
      console.log('✅ Colonne video_url ajoutée avec succès.');
    } else {
      console.log('ℹ️ Colonne video_url déjà présente.');
    }
  } catch (err) {
    console.error('❌ Erreur de migration:', err);
  } finally {
    await pool.end();
  }
}

migrate();
