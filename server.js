require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const connectDB = require('./src/config/db');
const apiRoutes = require('./src/routes');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');

const app = express();

// ---------- Core middleware ----------
// Increased limit (default is ~100kb) so base64-encoded project/profile
// pictures sent as JSON don't get rejected with a 413 Payload Too Large.
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// CORS: allow the configured frontend origin, plus common local-dev origins and
// requests with no Origin header at all (curl, or the admin panel opened directly
// as a file:// page). Set FRONTEND_URL in .env to lock this down for production.
const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5500';
const devOrigins = [allowedOrigin, 'https://aleempatel.dev', 'https://www.aleempatel.dev', 'http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:8080', 'http://127.0.0.1:8080'];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || devOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ---------- Robots.txt ----------
// Allow search engines and AI crawlers to crawl the API subdomain.
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
`User-agent: *
Allow: /
`
  );
});

// ---------- API routes ----------
// Note: no local /uploads static route - all uploads (profile picture, résumé,
// project images) go straight to the AWS S3 bucket configured in .env, and the
// database stores the full S3 URL returned for each file.
app.use('/api', apiRoutes);

app.get('/', (_req, res) => {
  res.json({ success: true, message: 'Portfolio backend is running. See /api/health.' });
});

// ---------- Error handling ----------
app.use(notFound);
app.use(errorHandler);

// ---------- Start ----------
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
    console.log(`Allowed frontend origin (CORS): ${allowedOrigin}`);
  });
});

module.exports = app;