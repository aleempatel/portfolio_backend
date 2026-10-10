const Skill = require('../models/Skill');
const crudFactory = require('./crudFactory');

const allowedFields = ['name', 'category', 'proficiency', 'order', 'iconUrl'];

module.exports = crudFactory(Skill, allowedFields, { label: 'Skill' });
