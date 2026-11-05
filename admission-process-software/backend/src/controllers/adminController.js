const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { tx, query } = require('../config/db');
const apps = require('../models/applicationModel');
const courses = require('../models/courseModel');
const users = require('../models/userModel');
const { canTransition, allRequiredVerified, STATUS } = require('../services/statusMachine');
const { notifyUser } = require('../services/notify');
const { asyncHandler, HttpError } = require('../middleware/error');

const stats = asyncHandler(async (req, res) => res.json(await apps.stats(env.academicYear)));

const listApplications = asyncHandler(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  res.json(await apps.list(filters, page, limit));
});

const getApplication = asyncHandler(async (req, res) => {
  const app = await apps.getFull(Number(req.params.id));
  if (!app || app.status === STATUS.DRAFT) throw new HttpError(404, 'Application not found');
  res.json({ application: app });
});

const STATUS_MESSAGES = {
  UNDER_VERIFICATION: 'is now under verification by the admission office.',
  DOCUMENTS_VERIFIED: 'documents have been verified.',
  REJECTED: 'has been rejected.',
};

const updateStatus = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status: to, remarks } = req.body;
  const app = await apps.getFull(id);
  if (!app || app.status === STATUS.DRAFT) throw new HttpError(404, 'Application not found');
  if (!canTransition(app.status, to)) throw new HttpError(409, `Cannot change status from ${app.status} to ${to}`);
  if (to === 'DOCUMENTS_VERIFIED' && !allRequiredVerified(app.documents)) throw new HttpError(409, 'Verify all required documents first');
  if (to === 'REJECTED' && !remarks) throw new HttpError(400, 'Please give a reason for rejection');

  await tx(async (client) => {
    const decided = ['APPROVED', 'REJECTED'].includes(to);
    await client.query(
      `UPDATE applications SET status=$2, remarks=COALESCE($3, remarks), updated_at=NOW(),
         decided_at = CASE WHEN $4 THEN NOW() ELSE decided_at END, decided_by = CASE WHEN $4 THEN $5 ELSE decided_by END WHERE id=$1`,
      [id, to, remarks || null, decided, req.user.id]);
    await apps.addHistory(client, id, app.status, to, remarks, req.user.id);
    if (to === 'APPROVED') { // approval immediately opens the fee payment step
      await client.query(`UPDATE applications SET status='FEE_PENDING' WHERE id=$1`, [id]);
      await apps.addHistory(client, id, 'APPROVED', 'FEE_PENDING', 'Awaiting admission fee payment', req.user.id);
    }
  });
  const msg = to === 'APPROVED'
    ? 'has been approved. Please pay the admission fee to confirm your seat.'
    : STATUS_MESSAGES[to];
  notifyUser(app.student.user_id, 'Application update', `Your application ${app.application_no} ${msg}${to === 'REJECTED' ? ` Reason: ${remarks}` : ''}`);
  res.json({ application: await apps.getFull(id) });
});

const verifyDocument = asyncHandler(async (req, res) => {
  const docId = Number(req.params.id);
  const { status, remarks } = req.body;
  if (status === 'REJECTED' && !remarks) throw new HttpError(400, 'Please give a reason for rejecting this document');
  const { rows } = await query(
    `SELECT d.id, d.doc_type, a.id AS app_id, a.status AS app_status, a.application_no, s.user_id
     FROM documents d JOIN applications a ON a.id=d.application_id JOIN students s ON s.id=a.student_id WHERE d.id=$1`, [docId]);
  const doc = rows[0];
  if (!doc) throw new HttpError(404, 'Document not found');
  if (!['SUBMITTED', 'UNDER_VERIFICATION'].includes(doc.app_status)) throw new HttpError(409, 'Documents can only be verified while the application is under review');

  await tx(async (client) => {
    await client.query(
      `UPDATE documents SET status=$2, remarks=$3, verified_by=$4, verified_at=NOW() WHERE id=$1`,
      [docId, status, remarks || null, req.user.id]);
    if (doc.app_status === 'SUBMITTED') {
      await client.query(`UPDATE applications SET status='UNDER_VERIFICATION', updated_at=NOW() WHERE id=$1`, [doc.app_id]);
      await apps.addHistory(client, doc.app_id, 'SUBMITTED', 'UNDER_VERIFICATION', 'Verification started', req.user.id);
    }
  });
  if (status === 'REJECTED') {
    notifyUser(doc.user_id, 'Document rejected', `A document in application ${doc.application_no} was rejected: ${remarks}. Please upload a corrected file.`);
  }
  res.json({ application: await apps.getFull(doc.app_id) });
});

// ---- courses & fees ----
const listCourses = asyncHandler(async (req, res) => res.json({ courses: await courses.list({ onlyActive: false }), departments: await courses.departments() }));

const createCourse = asyncHandler(async (req, res) => {
  const id = await tx((client) => courses.create(client, req.body, env.academicYear));
  res.status(201).json({ course: await courses.getById(id) });
});

const updateCourse = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const ok = await tx((client) => courses.update(client, id, req.body, env.academicYear));
  if (!ok) throw new HttpError(404, 'Course not found');
  res.json({ course: await courses.getById(id) });
});

const deactivateCourse = asyncHandler(async (req, res) => {
  await courses.deactivate(Number(req.params.id)); // soft delete keeps existing applications intact
  res.json({ ok: true });
});

// ---- users ----
const listUsers = asyncHandler(async (req, res) => res.json({ users: await users.list(['admin', 'officer', 'student'].includes(req.query.role) ? req.query.role : null) }));

const createUser = asyncHandler(async (req, res) => {
  if (await users.findByEmail(req.body.email)) throw new HttpError(409, 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(req.body.password, 12);
  const user = await tx((client) => users.createStaff(client, { ...req.body, passwordHash }));
  res.status(201).json({ user });
});

const patchUser = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new HttpError(400, 'You cannot deactivate your own account');
  const r = await users.setActive(id, req.body.is_active);
  if (!r.rowCount) throw new HttpError(404, 'User not found');
  res.json({ user: r.rows[0] });
});

// ---- reports ----
const report = asyncHandler(async (req, res) => {
  const rows = await apps.report(env.academicYear, req.query.from, req.query.to);
  const totals = rows.reduce((t, r) => ({
    applications: t.applications + r.applications, approved: t.approved + r.approved, rejected: t.rejected + r.rejected,
    confirmed: t.confirmed + r.confirmed, fees_collected: t.fees_collected + r.fees_collected,
  }), { applications: 0, approved: 0, rejected: 0, confirmed: 0, fees_collected: 0 });
  res.json({ academicYear: env.academicYear, rows, totals });
});

// prefix risky leading characters so spreadsheet apps do not execute cells as formulas
const csvCell = (v) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

const exportCsv = asyncHandler(async (req, res) => {
  const { page, limit, ...filters } = req.query;
  const rows = await apps.exportRows(filters);
  const head = ['Application No', 'Name', 'Mobile', 'Email', 'Course', 'Department', 'Category', 'Status', 'Submitted', 'Fee Paid (INR)'];
  const lines = [head.map(csvCell).join(',')].concat(rows.map((r) => Object.values(r).map(csvCell).join(',')));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="bec-applications.csv"');
  res.send(`\uFEFF${lines.join('\r\n')}`);
});

module.exports = { stats, listApplications, getApplication, updateStatus, verifyDocument, listCourses, createCourse, updateCourse, deactivateCourse, listUsers, createUser, patchUser, report, exportCsv };
