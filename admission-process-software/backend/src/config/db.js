const { Pool, types } = require('pg');

// return DATE columns as plain 'YYYY-MM-DD' strings (avoids timezone shifts)
types.setTypeParser(1082, (v) => v);
const env = require('./env');

// On Amazon RDS use DB_SSL=true. For strict verification supply the RDS CA bundle via `ssl: { ca }`.
const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.dbSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

const query = (text, params) => pool.query(text, params);

/** Run fn(client) inside a transaction. */
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, tx };
