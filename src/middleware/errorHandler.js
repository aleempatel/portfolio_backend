const multer = require('multer');

function notFound(req, res, _next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Server error';

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(' ');
  }

  // Invalid Mongo ObjectId
  if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Duplicate key (e.g. username already exists)
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `${field ? field.charAt(0).toUpperCase() + field.slice(1) : 'Value'} already exists.`;
  }

  // Multer upload errors
  if (err instanceof multer.MulterError) {
    status = 400;
    message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File too large (images max 8MB, profile picture max 5MB, resume max 10MB).';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Too many files (max 50 images per upload).';
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  res.status(status).json({ success: false, message });
}

module.exports = { notFound, errorHandler };
