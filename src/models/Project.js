const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    category: { type: String, default: '' },
    description: { type: String, default: '' },
    longDescription: { type: String, default: '' },
    technologies: { type: [String], default: [] },
    imageUrl: { type: String, default: '' },
    images: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    liveUrl: { type: String, default: '' },
    githubUrl: { type: String, default: '' },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProjectSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('Project', ProjectSchema);