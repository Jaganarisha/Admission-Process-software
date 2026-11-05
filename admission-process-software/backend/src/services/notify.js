const { query } = require('../config/db');
const { sendMail } = require('./email');

/** In-app notification + email (fire and forget; never blocks or fails the main request). */
async function notifyUser(userId, title, message) {
  try {
    await query('INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3)', [userId, title, message]);
    const { rows } = await query('SELECT email FROM users WHERE id=$1', [userId]);
    if (rows[0]) sendMail({ to: rows[0].email, subject: `BEC Admissions - ${title}`, text: message });
  } catch (err) { console.error('notify failed:', err.message); }
}

module.exports = { notifyUser };
