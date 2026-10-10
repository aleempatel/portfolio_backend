const Course = require('../models/Course');
const crudFactory = require('./crudFactory');

const allowedFields = ['title', 'provider', 'description', 'date', 'certificateUrl', 'order'];

module.exports = crudFactory(Course, allowedFields, { label: 'Course' });
