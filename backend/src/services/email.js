const env = require('../config/env');

let transporter;
function getTransporter() {
  if (!env.smtp.host) return null;
  if (!transporter) {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      host: env.smtp.host, port: env.smtp.port, secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    });
  }
  return transporter;
}

/** Email notification structure. Without SMTP settings (dev) the message is just logged. Use Amazon SES SMTP in production. */
async function sendMail({ to, subject, text }) {
  const t = getTransporter();
  if (!t) { console.log(`[email:dev] to=${to} subject="${subject}"`); return; }
  try { await t.sendMail({ from: env.smtp.from, to, subject, text }); }
  catch (err) { console.error('Email failed:', err.message); }
}

module.exports = { sendMail };
