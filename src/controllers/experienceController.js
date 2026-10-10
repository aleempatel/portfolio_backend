const Experience = require('../models/Experience');
const crudFactory = require('./crudFactory');

const allowedFields = [
  'jobTitle', 'company', 'location', 'employmentType',
  'startDate', 'endDate', 'current', 'description',
  'responsibilities', 'technologies', 'order',
];

module.exports = crudFactory(Experience, allowedFields, { label: 'Experience' });
