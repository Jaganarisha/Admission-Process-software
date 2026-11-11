const { query } = require('../config/db');
const { withTotals } = require('../services/feeCalc');

const STUDENT_COLS = ['full_name', 'dob', 'gender', 'mobile', 'email', 'address', 'city', 'state', 'pin_code',
  'guardian_name', 'guardian_relation', 'guardian_mobile', 'guardian_occupation'];
const ACADEMIC_COLS = ['tenth_school', 'tenth_percentage', 'twelfth_school', 'twelfth_percentage', 'passing_year', 'previous_qualification'];

const studentByUser = async (userId) => (await query('SELECT * FROM students WHERE user_id=$1', [userId])).rows[0];

async function getOrCreate(studentId, academicYear) {
  const { rows } = await query(
    `INSERT INTO applications (student_id, academic_year) VALUES ($1,$2)
     ON CONFLICT (student_id, academic_year) DO UPDATE SET student_id = EXCLUDED.student_id RETURNING id`,
    [studentId, academicYear]);
  return rows[0].id;
}

async function getFull(id) {
  const { rows } = await query(
    `SELECT a.id, a.application_no, a.status, a.remarks, a.academic_year, a.admission_category, a.course_id,
            a.submitted_at, a.decided_at, a.created_at, a.updated_at,
            s.id AS student_id, s.user_id, s.full_name, s.dob, s.gender, s.mobile, s.email, s.address, s.city, s.state, s.pin_code,
            s.guardian_name, s.guardian_relation, s.guardian_mobile, s.guardian_occupation,
            c.name AS course_name, c.code AS course_code, c.degree, c.level, c.duration_years, d.id AS department_id, d.name AS department_name,
            f.tuition_fee_per_year, f.admission_fee, f.caution_deposit, f.establishment_fee, f.electricity_fee_per_year,
            ad.tenth_school, ad.tenth_percentage, ad.twelfth_school, ad.twelfth_percentage, ad.passing_year, ad.previous_qualification
     FROM applications a
     JOIN students s ON s.id = a.student_id
     LEFT JOIN courses c ON c.id = a.course_id
     LEFT JOIN departments d ON d.id = c.department_id
     LEFT JOIN fee_structures f ON f.course_id = c.id
     LEFT JOIN academic_details ad ON ad.application_id = a.id
     WHERE a.id = $1`, [id]);
  const r = rows[0];
  if (!r) return null;
  const [docs, pay, hist] = await Promise.all([
    query(`SELECT id, doc_type, original_name, mime_type, size_bytes, status, remarks, uploaded_at, verified_at
           FROM documents WHERE application_id=$1 ORDER BY id`, [id]),
    query(`SELECT id, amount, method, status, transaction_ref, receipt_no, breakdown, paid_at
           FROM payments WHERE application_id=$1 AND status='SUCCESS' ORDER BY id DESC LIMIT 1`, [id]),
    query(`SELECT h.id, h.from_status, h.to_status, h.remarks, h.changed_at, u.name AS changed_by
           FROM admission_status h LEFT JOIN users u ON u.id = h.changed_by WHERE h.application_id=$1 ORDER BY h.id`, [id]),
  ]);
  const fee = r.course_id ? withTotals({
    tuition_fee_per_year: r.tuition_fee_per_year, admission_fee: r.admission_fee, caution_deposit: r.caution_deposit,
    establishment_fee: r.establishment_fee, electricity_fee_per_year: r.electricity_fee_per_year,
  }, r.duration_years, r.admission_category) : null;
  return {
    id: r.id, application_no: r.application_no, status: r.status, remarks: r.remarks, academic_year: r.academic_year,
    admission_category: r.admission_category, course_id: r.course_id, submitted_at: r.submitted_at, decided_at: r.decided_at,
    updated_at: r.updated_at,
    student: Object.fromEntries(['student_id', 'user_id', ...STUDENT_COLS].map((k) => [k, r[k]])),
    academic: Object.fromEntries(ACADEMIC_COLS.map((k) => [k, r[k]])),
    course: r.course_id ? {
      id: r.course_id, name: r.course_name, code: r.course_code, degree: r.degree, level: r.level,
      duration_years: r.duration_years, department_id: r.department_id, department_name: r.department_name,
    } : null,
    fee, documents: docs.rows, payment: pay.rows[0] || null, history: hist.rows,
  };
}

const addHistory = (client, appId, from, to, remarks, userId) =>
  client.query('INSERT INTO admission_status (application_id, from_status, to_status, remarks, changed_by) VALUES ($1,$2,$3,$4,$5)',
    [appId, from, to, remarks || null, userId || null]);

/** Builds filters shared by the list endpoint and the CSV export. */
function buildFilters(f) {
  const where = [`a.status <> 'DRAFT'`];
  const params = [];
  const add = (sql, v) => { params.push(v); where.push(sql.replaceAll('?', `$${params.length}`)); };
  if (f.search) add(`(a.application_no ILIKE ? OR s.full_name ILIKE ?)`, `%${String(f.search).replace(/[\\%_]/g, '\\$&')}%`);
  if (f.status) add('a.status = ?', f.status);
  if (f.course_id) add('a.course_id = ?', Number(f.course_id));
  if (f.department_id) add('c.department_id = ?', Number(f.department_id));
  if (f.from) add('a.submitted_at >= ?::date', f.from);
  if (f.to) add(`a.submitted_at < (?::date + 1)`, f.to);
  return { where: where.join(' AND '), params };
}

const LIST_FROM = `FROM applications a JOIN students s ON s.id=a.student_id
  LEFT JOIN courses c ON c.id=a.course_id LEFT JOIN departments d ON d.id=c.department_id`;

async function list(filters, page = 1, limit = 15) {
  const { where, params } = buildFilters(filters);
  const lim = Math.min(Math.max(Number(limit) || 15, 1), 50);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * lim;
  const [rows, total] = await Promise.all([
    query(`SELECT a.id, a.application_no, a.status, a.submitted_at, s.full_name, s.mobile, c.name AS course_name, c.code AS course_code, d.name AS department_name
           ${LIST_FROM} WHERE ${where} ORDER BY a.submitted_at DESC NULLS LAST, a.id DESC LIMIT ${lim} OFFSET ${offset}`, params),
    query(`SELECT COUNT(*)::int AS n ${LIST_FROM} WHERE ${where}`, params),
  ]);
  return { rows: rows.rows, total: total.rows[0].n, page: Number(page) || 1, limit: lim };
}

async function exportRows(filters) {
  const { where, params } = buildFilters(filters);
  const { rows } = await query(
    `SELECT a.application_no, s.full_name, s.mobile, s.email, c.name AS course, d.name AS department, a.admission_category,
            a.status, to_char(a.submitted_at,'YYYY-MM-DD') AS submitted, COALESCE(p.amount,0) AS fee_paid
     ${LIST_FROM} LEFT JOIN payments p ON p.application_id=a.id AND p.status='SUCCESS'
     WHERE ${where} ORDER BY a.id LIMIT 5000`, params);
  return rows;
}

async function stats(year) {
  const [t, byStatus, byCourse, monthly] = await Promise.all([
    query(`SELECT
        COUNT(*) FILTER (WHERE status<>'DRAFT')::int AS total,
        COUNT(*) FILTER (WHERE status IN ('SUBMITTED','UNDER_VERIFICATION'))::int AS pending,
        COUNT(*) FILTER (WHERE status IN ('DOCUMENTS_VERIFIED','APPROVED','FEE_PENDING','ADMISSION_CONFIRMED'))::int AS verified,
        COUNT(*) FILTER (WHERE status IN ('APPROVED','FEE_PENDING','ADMISSION_CONFIRMED'))::int AS approved,
        COUNT(*) FILTER (WHERE status='REJECTED')::int AS rejected,
        COUNT(*) FILTER (WHERE status='FEE_PENDING')::int AS fee_pending,
        COUNT(*) FILTER (WHERE status='ADMISSION_CONFIRMED')::int AS confirmed
      FROM applications WHERE academic_year=$1`, [year]),
    query(`SELECT status, COUNT(*)::int AS count FROM applications WHERE academic_year=$1 AND status<>'DRAFT' GROUP BY status`, [year]),
    query(`SELECT c.code, c.name, COUNT(a.id)::int AS count FROM courses c
           LEFT JOIN applications a ON a.course_id=c.id AND a.status<>'DRAFT' AND a.academic_year=$1
           WHERE c.active GROUP BY c.id ORDER BY c.level, c.code`, [year]),
    query(`SELECT to_char(m,'Mon YY') AS month, cnt FROM (
             SELECT date_trunc('month', submitted_at) AS m, COUNT(*)::int AS cnt FROM applications
             WHERE submitted_at >= date_trunc('month', NOW()) - interval '5 months' GROUP BY 1) t ORDER BY m`),
  ]);
  return { totals: t.rows[0], byStatus: byStatus.rows, byCourse: byCourse.rows, monthly: monthly.rows };
}

async function report(year, from, to) {
  const { rows } = await query(
    `SELECT c.code, c.name,
        COUNT(DISTINCT a.id)::int AS applications,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status IN ('APPROVED','FEE_PENDING','ADMISSION_CONFIRMED'))::int AS approved,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status='REJECTED')::int AS rejected,
        COUNT(DISTINCT a.id) FILTER (WHERE a.status='ADMISSION_CONFIRMED')::int AS confirmed,
        COALESCE(SUM(p.amount) FILTER (WHERE p.status='SUCCESS'),0)::float AS fees_collected
     FROM courses c
     LEFT JOIN applications a ON a.course_id=c.id AND a.status<>'DRAFT' AND a.academic_year=$1
          AND ($2::date IS NULL OR a.submitted_at >= $2::date) AND ($3::date IS NULL OR a.submitted_at < $3::date + 1)
     LEFT JOIN payments p ON p.application_id=a.id
     GROUP BY c.id ORDER BY c.level, c.code`, [year, from || null, to || null]);
  return rows;
}

module.exports = { STUDENT_COLS, ACADEMIC_COLS, studentByUser, getOrCreate, getFull, addHistory, list, exportRows, stats, report };
