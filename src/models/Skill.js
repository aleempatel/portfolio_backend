const mongoose = require('mongoose');

const SkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    category: { type: String, default: '' },
    proficiency: { type: Number, min: 0, max: 100, default: 80 },
    order: { type: Number, default: 0 },
    iconUrl: { type: String, default: '' },
  },
  { timestamps: true }
);

SkillSchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('Skill', SkillSchema);
