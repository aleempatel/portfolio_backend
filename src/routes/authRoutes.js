const express = require('express');
const { login, logout, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.put('/change-password', protect, changePassword);

module.exports = router;
