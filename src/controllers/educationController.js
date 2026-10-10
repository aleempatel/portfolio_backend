const Education = require('../models/Education');
const crudFactory = require('./crudFactory');

const allowedFields = [
  'degree', 'institution', 'location', 'grade',
  'startDate', 'endDate', 'description', 'order',
];

module.exports = crudFactory(Education, allowedFields, { label: 'Education' });
