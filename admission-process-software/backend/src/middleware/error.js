const env = require('../config/env');

const notFound = (req, res) => res.status(404).json({ message: 'Route not found' });

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'MulterError') {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 2 MB)' : 'Invalid upload';
    return res.status(400).json({ message: msg });
  }
  if (err.status && err.status < 500) return res.status(err.status).json({ message: err.message });
  if (err.code === '23505') return res.status(409).json({ message: 'A record with these details already exists' });
  console.error(err); // goes to CloudWatch via stdout
  return res.status(500).json({ message: 'Something went wrong. Please try again.', ...(env.isProd ? {} : { detail: err.message }) });
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { notFound, errorHandler, HttpError, asyncHandler };
