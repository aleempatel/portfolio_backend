const mongoose = require('mongoose');

const EducationSchema = new mongoose.Schema(
  {
    degree: { type: String, required: [true, 'Degree is required'], trim: true },
    institution: { type: String, required: [true, 'Institution is required'], trim: true },
    location: { type: String, default: '' },
    grade: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    description: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

EducationSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('Education', EducationSchema);
