// PM2 process file for EC2:  pm2 start ecosystem.config.js && pm2 save && pm2 startup
module.exports = {
  apps: [{
    name: 'bec-admission-api',
    script: 'server.js',
    instances: 1,
    env: { NODE_ENV: 'production' }, // other values come from backend/.env or the instance environment
    max_memory_restart: '400M',
  }],
};
