
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: env.clientOrigin,
  credentials: true
}));

app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
}));

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// API routes
app.use('/api', routes);

// Serve React frontend
const frontendDist = path.resolve(
  __dirname,
  '../../frontend/dist'
);

app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
