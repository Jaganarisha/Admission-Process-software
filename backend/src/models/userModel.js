const { query } = require('../config/db');

const findByEmail = async (email) => (await query('SELECT * FROM users WHERE email=$1', [email])).rows[0];
const findById = async (id) => (await query('SELECT id,name,email,role,is_active,created_at FROM users WHERE id=$1', [id])).rows[0];

async function createStudent(client, { name, email, mobile, passwordHash }) {
  const { rows } = await client.query(
    `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,'student') RETURNING id,name,email,role`,
    [name, email, passwordHash]);
  await client.query('INSERT INTO students (user_id, full_name, email, mobile) VALUES ($1,$2,$3,$4)', [rows[0].id, name, email, mobile]);
  return rows[0];
}

async function createStaff(client, { name, email, passwordHash, role, designation }) {
  const { rows } = await client.query(
    `INSERT INTO users (name,email,password_hash,role) VALUES ($1,$2,$3,$4) RETURNING id,name,email,role,is_active`,
    [name, email, passwordHash, role]);
  await client.query('INSERT INTO admins (user_id, designation) VALUES ($1,$2)', [rows[0].id, designation || null]);
  return rows[0];
}

async function list(role) {
  const params = [];
  let where = '';
  if (role) { params.push(role); where = 'WHERE u.role=$1'; }
  const { rows } = await query(
    `SELECT u.id,u.name,u.email,u.role,u.is_active,u.created_at,a.designation
     FROM users u LEFT JOIN admins a ON a.user_id=u.id ${where} ORDER BY u.created_at DESC LIMIT 500`, params);
  return rows;
}

const setActive = (id, active) => query('UPDATE users SET is_active=$2, updated_at=NOW() WHERE id=$1 RETURNING id,is_active', [id, active]);

async function findByMobile(mobile, portal = 'student') {
  const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
  if (!digits || digits.length !== 10) return null;

  if (portal === 'student') {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, s.mobile
       FROM users u
       JOIN students s ON s.user_id = u.id
       WHERE s.mobile = $1 AND u.role = 'student'`,
      [digits]
    );
    return rows[0];
  } else {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, a.phone as mobile
       FROM users u
       JOIN admins a ON a.user_id = u.id
       WHERE a.phone = $1 AND u.role IN ('admin', 'officer')`,
      [digits]
    );
    return rows[0];
  }
}

async function findUserByIdentifier(identifier, portal = 'student') {
  if (!identifier) return null;
  const raw = String(identifier).trim();
  const digits = raw.replace(/\D/g, '').slice(-10);

  if (raw.includes('@')) {
    if (portal === 'student') {
      const { rows } = await query(
        `SELECT u.id, u.name, u.email, u.role, u.is_active, s.mobile
         FROM users u
         LEFT JOIN students s ON s.user_id = u.id
         WHERE LOWER(u.email) = LOWER($1) AND u.role = 'student'`,
        [raw]
      );
      return rows[0];
    } else {
      const { rows } = await query(
        `SELECT u.id, u.name, u.email, u.role, u.is_active, a.phone as mobile
         FROM users u
         LEFT JOIN admins a ON a.user_id = u.id
         WHERE LOWER(u.email) = LOWER($1) AND u.role IN ('admin', 'officer')`,
        [raw]
      );
      return rows[0];
    }
  } else if (digits.length === 10) {
    return findByMobile(digits, portal);
  }
  return null;
}

async function findStudentByEmailAndMobile(email, mobile) {
  const digits = String(mobile || '').replace(/\D/g, '').slice(-10);
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role, u.is_active, s.mobile
     FROM users u
     JOIN students s ON s.user_id = u.id
     WHERE LOWER(u.email) = LOWER($1) AND s.mobile = $2 AND u.role = 'student'`,
    [email, digits]
  );
  return rows[0];
}

async function savePasswordReset({ userId, email, mobile, code, token, expiresAt }) {
  const cleanMobile = mobile ? String(mobile).replace(/\D/g, '').slice(-10) : null;
  await query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
  const { rows } = await query(
    `INSERT INTO password_resets (user_id, email, mobile, code, token, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, email, mobile, code, token, expires_at`,
    [userId, email, cleanMobile, code, token, expiresAt]
  );
  return rows[0];
}

async function findPasswordReset(identifier, code) {
  if (!identifier || !code) return null;
  const raw = String(identifier).trim();
  const digits = raw.replace(/\D/g, '').slice(-10);
  const isMobile = digits.length === 10 && !raw.includes('@');

  let rows;
  if (isMobile) {
    const res = await query(
      `SELECT pr.*, u.id as user_id, u.name, u.email as user_email, u.role, u.is_active, s.mobile
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN admins a ON a.user_id = u.id
       WHERE (pr.mobile = $1 OR s.mobile = $1 OR a.phone = $1)
         AND pr.code = $2 AND pr.expires_at > NOW()
       ORDER BY pr.created_at DESC LIMIT 1`,
      [digits, code]
    );
    rows = res.rows;
  } else {
    const res = await query(
      `SELECT pr.*, u.id as user_id, u.name, u.email as user_email, u.role, u.is_active, s.mobile
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       LEFT JOIN students s ON s.user_id = u.id
       WHERE (LOWER(pr.email) = LOWER($1) OR LOWER(u.email) = LOWER($1))
         AND pr.code = $2 AND pr.expires_at > NOW()
       ORDER BY pr.created_at DESC LIMIT 1`,
      [raw, code]
    );
    rows = res.rows;
  }
  return rows[0];
}

async function updatePassword(userId, passwordHash) {
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
  await query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
}

module.exports = {
  findByEmail,
  findById,
  findByMobile,
  findUserByIdentifier,
  createStudent,
  createStaff,
  list,
  setActive,
  findStudentByEmailAndMobile,
  savePasswordReset,
  findPasswordReset,
  updatePassword,
};

