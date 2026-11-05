const env = require('../config/env');
const { tx, query } = require('../config/db');
const apps = require('../models/applicationModel');
const courses = require('../models/courseModel');
const schemas = require('../validators/schemas');
const { missingRequiredDocs, STATUS } = require('../services/statusMachine');
const { firstYearBreakdown, firstYearTotal } = require('../services/feeCalc');
const payments = require('../services/paymentService');
const { notifyUser } = require('../services/notify');
const { asyncHandler, HttpError } = require('../middleware/error');

async function myApplicationId(userId) {
  const student = await apps.studentByUser(userId);
  if (!student) throw new HttpError(404, 'Student profile not found');
  return apps.getOrCreate(student.id, env.academicYear);
}

/** Builds "col=$2, col2=$3" from whitelisted columns only (values stay parameterised). */
function setClause(cols, data, startAt = 2) {
  const used = cols.filter((c) => data[c] !== undefined);
  return { used, sql: used.map((c, i) => `${c}=$${i + startAt}`).join(', '), values: used.map((c) => data[c]) };
}

const getMine = asyncHandler(async (req, res) => {
  const id = await myApplicationId(req.user.id);
  res.json({ application: await apps.getFull(id) });
});

const saveMine = asyncHandler(async (req, res) => {
  const id = await myApplicationId(req.user.id);
  const current = await apps.getFull(id);
  if (current.status !== STATUS.DRAFT) throw new HttpError(409, 'Submitted applications cannot be edited');
  const d = req.body;
  if (d.course_id !== undefined) {
    const c = await courses.getById(d.course_id);
    if (!c || !c.active) throw new HttpError(400, 'Selected course is not available');
  }
  await tx(async (client) => {
    const s = setClause(apps.STUDENT_COLS, d, 2);
    if (s.used.length) await client.query(`UPDATE students SET ${s.sql}, updated_at=NOW() WHERE id=$1`, [current.student.student_id, ...s.values]);
    const a = setClause(apps.ACADEMIC_COLS, d, 2);
    if (a.used.length) {
      await client.query(
        `INSERT INTO academic_details (application_id, ${a.used.join(',')}) VALUES ($1, ${a.used.map((_, i) => `$${i + 2}`).join(',')})
         ON CONFLICT (application_id) DO UPDATE SET ${a.used.map((c) => `${c}=EXCLUDED.${c}`).join(', ')}`, [id, ...a.values]);
    }
    const p = setClause(['course_id', 'admission_category'], d, 2);
    if (p.used.length) await client.query(`UPDATE applications SET ${p.sql}, updated_at=NOW() WHERE id=$1`, [id, ...p.values]);
  });
  res.json({ application: await apps.getFull(id) });
});

const submitMine = asyncHandler(async (req, res) => {
  const id = await myApplicationId(req.user.id);
  const app = await apps.getFull(id);
  if (app.status !== STATUS.DRAFT) throw new HttpError(409, 'Application has already been submitted');

  const flat = { ...app.student, ...app.academic, course_id: app.course_id, admission_category: app.admission_category };
  for (const k of Object.keys(flat)) if (flat[k] === null) delete flat[k];
  const check = schemas.applicationFull.safeParse(flat);
  if (!check.success) {
    const errors = {};
    check.error.issues.forEach((i) => { errors[i.path.join('.')] = i.message; });
    return res.status(400).json({ message: 'Please complete all sections before submitting', errors });
  }
  const missing = missingRequiredDocs(app.documents);
  if (missing.length) return res.status(400).json({ message: 'Required documents are missing', missing });

  const appNo = `BEC${env.academicYear.slice(2, 4)}-${String(id).padStart(5, '0')}`;
  await tx(async (client) => {
    await client.query(`UPDATE applications SET status='SUBMITTED', application_no=$2, submitted_at=NOW(), updated_at=NOW() WHERE id=$1`, [id, appNo]);
    await apps.addHistory(client, id, 'DRAFT', 'SUBMITTED', 'Application submitted by student', req.user.id);
  });
  notifyUser(req.user.id, 'Application submitted', `Your application ${appNo} has been submitted and will be verified by the admission office.`);
  res.json({ application: await apps.getFull(id) });
});

const payMine = asyncHandler(async (req, res) => {
  const id = await myApplicationId(req.user.id);
  const app = await apps.getFull(id);
  if (app.status !== STATUS.FEE_PENDING) throw new HttpError(409, 'Fee payment is not available for this application yet');
  const breakdown = firstYearBreakdown(app.fee);
  const amount = firstYearTotal(app.fee);          // always recomputed on the server - never trusted from the client
  if (amount <= 0) throw new HttpError(409, 'Fee structure is not configured for this course');

  const result = await payments.charge({ amount, method: req.body.method });
  if (result.status !== 'SUCCESS') throw new HttpError(402, 'Payment failed. Please try again.');

  await tx(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO payments (application_id, amount, method, status, transaction_ref, breakdown, paid_at)
       VALUES ($1,$2,$3,'SUCCESS',$4,$5,NOW()) RETURNING id`,
      [id, amount, req.body.method, result.reference, JSON.stringify(breakdown)]);
    const receipt = `RCPT${env.academicYear.slice(2, 4)}-${String(rows[0].id).padStart(6, '0')}`;
    await client.query('UPDATE payments SET receipt_no=$2 WHERE id=$1', [rows[0].id, receipt]);
    await client.query(`UPDATE applications SET status='ADMISSION_CONFIRMED', updated_at=NOW() WHERE id=$1`, [id]);
    await apps.addHistory(client, id, 'FEE_PENDING', 'ADMISSION_CONFIRMED', `Fee paid (${receipt})`, req.user.id);
  });
  notifyUser(req.user.id, 'Admission confirmed', `Payment received for ${app.application_no}. Your admission is confirmed - download your confirmation letter from the portal.`);
  res.json({ application: await apps.getFull(id) });
});

const myNotifications = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id,title,message,is_read,created_at FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 50', [req.user.id]);
  res.json({ notifications: rows, unread: rows.filter((n) => !n.is_read).length });
});
const markRead = asyncHandler(async (req, res) => {
  await query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND ($2::int IS NULL OR id=$2)', [req.user.id, req.params.id ? Number(req.params.id) : null]);
  res.json({ ok: true });
});

module.exports = { getMine, saveMine, submitMine, payMine, myNotifications, markRead };
