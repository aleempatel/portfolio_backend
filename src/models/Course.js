const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    provider: { type: String, default: '' }, // e.g. "DigiSkills", "IBM SkillBuild"
    description: { type: String, default: '' },
    date: { type: String, default: '' }, // free-form, e.g. "2024" or "Jan 2024"
    certificateUrl: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CourseSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('Course', CourseSchema);
