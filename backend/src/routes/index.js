const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { authenticate, staffOnly, adminOnly, studentOnly } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const s = require('../validators/schemas');
const auth = require('../controllers/authController');
const pub = require('../controllers/publicController');
const app = require('../controllers/applicationController');
const doc = require('../controllers/documentController');
const admin = require('../controllers/adminController');
const env = require('../config/env');

const router = express.Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Try again later.' } });
const uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: env.maxFileBytes, files: 1 } });

router.get('/health', (req, res) => res.json({ status: 'ok' }));

// public
router.get('/courses', pub.listCourses);
router.get('/departments', pub.listDepartments);

// auth
router.post('/auth/register', authLimiter, validate(s.register), auth.register);
router.post('/auth/login', authLimiter, validate(s.login), auth.login);
router.post('/auth/forgot-password', authLimiter, validate(s.forgotPassword), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(s.resetPassword), auth.resetPassword);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', authenticate, auth.me);


// documents (file streaming is shared by owner + staff)
router.get('/documents/:id/file', authenticate, doc.file);

// notifications (any logged-in user)
router.get('/notifications', authenticate, app.myNotifications);
router.patch('/notifications/read', authenticate, app.markRead);
router.patch('/notifications/:id/read', authenticate, app.markRead);

// student
const student = express.Router();
student.use(authenticate, studentOnly);
student.get('/applications/me', app.getMine);
student.put('/applications/me', validate(s.applicationDraft), app.saveMine);
student.post('/applications/me/submit', app.submitMine);
student.post('/applications/me/pay', validate(s.payment), app.payMine);
student.post('/applications/me/documents', uploader.single('file'), doc.upload);
student.delete('/applications/me/documents/:id', doc.remove);
router.use('/student', student);

// admin + admission officer
const staff = express.Router();
staff.use(authenticate, staffOnly);
staff.get('/stats', admin.stats);
staff.get('/applications', admin.listApplications);
staff.get('/applications/:id', admin.getApplication);
staff.patch('/applications/:id/status', validate(s.statusUpdate), admin.updateStatus);
staff.patch('/documents/:id', validate(s.docVerify), admin.verifyDocument);
staff.get('/courses', admin.listCourses);
staff.get('/reports/summary', admin.report);
staff.get('/reports/applications.csv', admin.exportCsv);
// admin only
staff.post('/courses', adminOnly, validate(s.course), admin.createCourse);
staff.put('/courses/:id', adminOnly, validate(s.course), admin.updateCourse);
staff.delete('/courses/:id', adminOnly, admin.deactivateCourse);
staff.get('/users', adminOnly, admin.listUsers);
staff.post('/users', adminOnly, validate(s.staffUser), admin.createUser);
staff.patch('/users/:id', adminOnly, validate(s.userPatch), admin.patchUser);
router.use('/admin', staff);

module.exports = router;
