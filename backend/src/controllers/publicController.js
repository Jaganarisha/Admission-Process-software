const courses = require('../models/courseModel');
const { asyncHandler } = require('../middleware/error');
const env = require('../config/env');

const listCourses = asyncHandler(async (req, res) => res.json({ academicYear: env.academicYear, courses: await courses.list({ onlyActive: true }) }));
const listDepartments = asyncHandler(async (req, res) => res.json({ departments: await courses.departments() }));

module.exports = { listCourses, listDepartments };
