const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const asyncHandler = require('../utils/asyncHandler');

function signToken(admin) {
  return jwt.sign({ id: admin._id, username: admin.username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const admin = await Admin.findOne({ username: username.trim() });
  if (!admin) {
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }

  const match = await admin.comparePassword(password);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  }

  const token = signToken(admin);
  res.json({
    success: true,
    token,
    user: { id: admin._id, username: admin.username },
  });
});

// POST /api/auth/logout
// JWTs are stateless, so there's nothing to invalidate server-side;
// the frontend just discards the token. This endpoint exists so the
// admin panel's logout button always has something to call.
const logout = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Logged out.' });
});

// PUT /api/auth/change-password  (protected)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }

  const admin = await Admin.findById(req.admin.id);
  if (!admin) {
    return res.status(404).json({ success: false, message: 'Admin account not found.' });
  }

  const match = await admin.comparePassword(currentPassword);
  if (!match) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  admin.password = newPassword; // pre-save hook re-hashes it
  await admin.save();

  res.json({ success: true, message: 'Password updated.' });
});

module.exports = { login, logout, changePassword };
