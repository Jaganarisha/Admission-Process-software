const env = require('./src/config/env');
const app = require('./src/app');
const { pool } = require('./src/config/db');

const server = app.listen(env.port, () => {
  console.log(`BEC Admission API listening on :${env.port} (${env.nodeEnv}) storage=${env.storage.driver}`);
});

function shutdown() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
