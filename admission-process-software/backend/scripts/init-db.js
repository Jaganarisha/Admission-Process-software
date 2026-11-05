// Creates tables and loads BEC departments, courses and fee structure.  Usage: npm run db:init
const fs = require('fs');
const path = require('path');
const env = require('../src/config/env');
const { pool } = require('../src/config/db');

(async () => {
  if (env.isProd && !process.argv.includes('--force')) {
    console.error('Refusing to run in production: schema.sql DROPS all tables. Re-run with --force if you really mean it.');
    process.exit(1);
  }
  const dir = path.join(__dirname, '../../database');
  for (const file of ['schema.sql', 'seed.sql']) {
    await pool.query(fs.readFileSync(path.join(dir, file), 'utf8'));
    console.log(`Applied ${file}`);
  }
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
