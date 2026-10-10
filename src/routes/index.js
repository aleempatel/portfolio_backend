const express = require('express');

const authRoutes = require('./authRoutes');
const profileRoutes = require('./profileRoutes');
const crudRoutes = require('./crudRoutes');
const projectRoutes = require('./projectRoutes');
const contactRoutes = require('./contactRoutes');

const skillController = require('../controllers/skillController');
const experienceController = require('../controllers/experienceController');
const educationController = require('../controllers/educationController');
const courseController = require('../controllers/courseController');

const router = express.Router();

router.get('/health', (_req, res) => res.json({ success: true, message: 'API is running.' }));

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/contact', contactRoutes);
router.use('/projects', projectRoutes);
router.use('/skills', crudRoutes(skillController));
router.use('/experience', crudRoutes(experienceController));
router.use('/education', crudRoutes(educationController));
router.use('/courses', crudRoutes(courseController));

module.exports = router;
