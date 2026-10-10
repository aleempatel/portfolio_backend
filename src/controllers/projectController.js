const Project = require('../models/Project');
const crudFactory = require('./crudFactory');
const { removeFromS3 } = require('../middleware/upload');

const allowedFields = [
  'title', 'category', 'description', 'longDescription',
  'technologies', 'order', 'liveUrl', 'githubUrl', 'featured',
];

const controller = crudFactory(Project, allowedFields, { label: 'Project' });

const MAX_IMAGES = 50; // hard cap per project, enforced here and by multer's `files` limit

// POST /api/projects/:id/images  (protected, multipart/form-data field "images", multiple files)
// Each accepted file is already sitting in S3 (multer-s3 uploads it before this
// handler runs); req.files[i].location is its public URL.
controller.uploadImages = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: 'No files uploaded. Use field name "images".' });
    }

    const room = MAX_IMAGES - (project.images ? project.images.length : 0);
    if (room <= 0) {
      // Clean up the files multer-s3 already uploaded before we knew the project was full.
      await Promise.all(files.map((f) => removeFromS3(f.location)));
      return res.status(400).json({ success: false, message: `Maximum of ${MAX_IMAGES} images per project.` });
    }

    const accepted = files.slice(0, room);
    const rejected = files.slice(room);
    if (rejected.length) await Promise.all(rejected.map((f) => removeFromS3(f.location)));

    const newUrls = accepted.map((f) => f.location);
    project.images = [...(project.images || []), ...newUrls];
    if (!project.imageUrl && project.images.length) project.imageUrl = project.images[0];
    await project.save();

    res.json({
      success: true,
      data: project,
      message: `${accepted.length} image(s) uploaded.${rejected.length ? ` ${rejected.length} skipped (${MAX_IMAGES}-image limit reached).` : ''}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/projects/:id/images/:index  (protected)
controller.deleteImage = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    const idx = Number(req.params.index);
    if (!Number.isInteger(idx) || idx < 0 || idx >= (project.images || []).length) {
      return res.status(400).json({ success: false, message: 'Invalid image index.' });
    }
    const [removed] = project.images.splice(idx, 1);
    await removeFromS3(removed);
    project.imageUrl = project.images[0] || '';
    await project.save();

    res.json({ success: true, data: project, message: 'Image removed.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = controller;
