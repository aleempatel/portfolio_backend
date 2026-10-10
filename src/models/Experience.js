const mongoose = require('mongoose');

const ExperienceSchema = new mongoose.Schema(
  {
    jobTitle: { type: String, required: [true, 'Job title is required'], trim: true },
    company: { type: String, required: [true, 'Company is required'], trim: true },
    location: { type: String, default: '' },
    employmentType: { type: String, default: '' }, // e.g. Full-time, Internship, Freelance
    startDate: { type: String, default: '' }, // free-form string, e.g. "Jan 2022"
    endDate: { type: String, default: '' },
    current: { type: Boolean, default: false },
    description: { type: String, default: '' },
    responsibilities: { type: [String], default: [] },
    technologies: { type: [String], default: [] },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ExperienceSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('Experience', ExperienceSchema);
