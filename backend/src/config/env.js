const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.JWT_SECRET || (isProd && process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET is required (min 32 characters in production)');
}

module.exports = {
  nodeEnv,
  isProd,
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  academicYear: process.env.ACADEMIC_YEAR || '2026-27',
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: process.env.DB_SSL === 'true',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  storage: {
    driver: process.env.S3_BUCKET ? 's3' : 'local',
    bucket: process.env.S3_BUCKET || '',
    region: process.env.AWS_REGION || 'ap-south-1',
    localDir: path.join(__dirname, '../../uploads'),
  },
  maxFileBytes: 2 * 1024 * 1024,
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'BEC Admissions <admissions@bec.ac.in>',
  },
};
