const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadProjectImages } = require('../middleware/upload');
const projectController = require('../controllers/projectController');
const crudRoutes = require('./crudRoutes');

const router = express.Router();

router.use('/', crudRoutes(projectController));

router.post('/:id/images', protect, uploadProjectImages.array('images', 50), projectController.uploadImages);
router.delete('/:id/images/:index', protect, projectController.deleteImage);

module.exports = router;
