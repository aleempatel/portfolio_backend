const express = require('express');
const { sendContactMessage } = require('../controllers/contactController');

const router = express.Router();

// Public - anyone visiting the site can send a message via the contact form.
router.post('/', sendContactMessage);

module.exports = router;
