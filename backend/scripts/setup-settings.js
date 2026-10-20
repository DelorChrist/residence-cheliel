import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3307,
    user: process.env.DB_USER || 'residence_user',
    password: process.env.DB_PASSWORD || 'ChelielLocal_2026_Db',
    database: process.env.DB_NAME || 'residence_cheliel',
  });

  console.log('Connected to MySQL.');

  await conn.query(`
    CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(64) PRIMARY KEY,
      \`value\` TEXT NOT NULL,
      \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('Table settings ensured.');

  const defaultAmenities = [
    'Climatisation',
    'Wifi',
    'Canal',
    'Cuisine équipée',
    'Eau chaude'
  ];

  await conn.query(`
    INSERT INTO settings (\`key\`, \`value\`)
    VALUES ('default_amenities', ?)
    ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)
  `, [JSON.stringify(defaultAmenities)]);
  console.log('Default amenities set in settings table.');

  const cleanAmenities = ['Climatisation', 'Wifi', 'Canal', 'Cuisine équipée', 'Eau chaude'];
  await conn.query('UPDATE rooms SET amenities = ? WHERE id = ?', [JSON.stringify(cleanAmenities), 'suite-1791654904779']);
  console.log('Chambre 10 amenities cleaned to:', cleanAmenities);

  const [settingsRows] = await conn.query('SELECT * FROM settings');
  console.log('Current settings:', settingsRows);

  await conn.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
