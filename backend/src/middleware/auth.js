const jwt = require('jsonwebtoken');
const env = require('../config/env');

const COOKIE = 'bec_token';

function cookieOptions() {
  return { httpOnly: true, sameSite: 'strict', secure: env.isProd, maxAge: 8 * 60 * 60 * 1000, path: '/' };
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, name: user.name }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

/** Reads the JWT from the httpOnly cookie (Authorization: Bearer is accepted for API clients). */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = req.cookies?.[COOKIE] || (header.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    const p = jwt.verify(token, env.jwtSecret);
    req.user = { id: Number(p.sub), role: p.role, name: p.name };
    return next();
  } catch {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
}

const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user?.role) ? next() : res.status(403).json({ message: 'You do not have access to this resource' });

const staffOnly = authorize('admin', 'officer');
const adminOnly = authorize('admin');
const studentOnly = authorize('student');

module.exports = { COOKIE, cookieOptions, signToken, authenticate, authorize, staffOnly, adminOnly, studentOnly };
