const { query } = require('../config/db');
const { withTotals } = require('../services/feeCalc');

const SELECT = `
  SELECT c.id, c.code, c.name, c.degree, c.level, c.duration_years, c.eligibility, c.active,
         d.id AS department_id, d.name AS department_name, d.code AS department_code,
         f.academic_year, f.tuition_fee_per_year, f.admission_fee, f.caution_deposit, f.establishment_fee, f.electricity_fee_per_year
  FROM courses c
  JOIN departments d ON d.id = c.department_id
  LEFT JOIN fee_structures f ON f.course_id = c.id`;

const shape = (r) => ({
  ...r,
  tuition_fee_per_year: Number(r.tuition_fee_per_year || 0),
  admission_fee: Number(r.admission_fee || 0),
  caution_deposit: Number(r.caution_deposit || 0),
  establishment_fee: Number(r.establishment_fee || 0),
  electricity_fee_per_year: Number(r.electricity_fee_per_year || 0),
  ...(({ total_tuition, first_year_payable }) => ({ total_tuition, first_year_payable }))(withTotals(r, r.duration_years)),
});

async function list({ onlyActive }) {
  const { rows } = await query(`${SELECT} ${onlyActive ? 'WHERE c.active AND d.active' : ''} ORDER BY c.level, d.name, c.degree`);
  return rows.map(shape);
}
const getById = async (id) => { const { rows } = await query(`${SELECT} WHERE c.id=$1`, [id]); return rows[0] && shape(rows[0]); };
const departments = async () => (await query('SELECT id, code, name FROM departments WHERE active ORDER BY name')).rows;

const FEE_COLS = ['tuition_fee_per_year', 'admission_fee', 'caution_deposit', 'establishment_fee', 'electricity_fee_per_year'];

async function create(client, d, academicYear) {
  const { rows } = await client.query(
    `INSERT INTO courses (department_id,code,name,degree,level,duration_years,eligibility,active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,TRUE)) RETURNING id`,
    [d.department_id, d.code, d.name, d.degree, d.level, d.duration_years, d.eligibility || null, d.active]);
  await client.query(
    `INSERT INTO fee_structures (course_id, academic_year, ${FEE_COLS.join(',')}) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [rows[0].id, academicYear, ...FEE_COLS.map((c) => d[c])]);
  return rows[0].id;
}

async function update(client, id, d, academicYear) {
  const r = await client.query(
    `UPDATE courses SET department_id=$2, code=$3, name=$4, degree=$5, level=$6, duration_years=$7, eligibility=$8, active=COALESCE($9, active)
     WHERE id=$1`,
    [id, d.department_id, d.code, d.name, d.degree, d.level, d.duration_years, d.eligibility || null, d.active]);
  if (!r.rowCount) return false;
  await client.query(
    `INSERT INTO fee_structures (course_id, academic_year, ${FEE_COLS.join(',')}) VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (course_id) DO UPDATE SET academic_year=EXCLUDED.academic_year, ${FEE_COLS.map((c) => `${c}=EXCLUDED.${c}`).join(', ')}, updated_at=NOW()`,
    [id, academicYear, ...FEE_COLS.map((c) => d[c])]);
  return true;
}

const deactivate = (id) => query('UPDATE courses SET active=FALSE WHERE id=$1', [id]);

module.exports = { list, getById, departments, create, update, deactivate };
