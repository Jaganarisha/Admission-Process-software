import { useEffect, useState } from 'react';
import api, { errorMessage, fieldErrors } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog, Field, Modal, Spinner } from '../../components/ui';
import { inr } from '../../utils/format';

const FEE_KEYS = ['tuition_fee_per_year', 'admission_fee', 'caution_deposit', 'establishment_fee', 'electricity_fee_per_year'];
const BLANK = { department_id: '', code: '', name: '', degree: 'B.E.', level: 'UG', duration_years: 4, eligibility: '', active: 'true',
  tuition_fee_per_year: 55000, admission_fee: 500, caution_deposit: 5000, establishment_fee: 2000, electricity_fee_per_year: 2000 };

export default function CoursesFees() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';
  const toast = useToast();
  const [data, setData] = useState(null);
  const [edit, setEdit] = useState(null);      // form object (id present when editing)
  const [errors, setErrors] = useState({});
  const [toggle, setToggle] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/courses').then((r) => setData(r.data)).catch((e) => toast.error(errorMessage(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return <Spinner />;

  const set = (e) => setEdit({ ...edit, [e.target.name]: e.target.value });
  const payload = (f) => ({
    department_id: Number(f.department_id), code: f.code, name: f.name, degree: f.degree, level: f.level, duration_years: Number(f.duration_years),
    eligibility: f.eligibility || undefined, active: f.active === true || f.active === 'true',
    ...Object.fromEntries(FEE_KEYS.map((k) => [k, Number(f[k])])),
  });
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try {
      if (edit.id) await api.put(`/admin/courses/${edit.id}`, payload(edit)); else await api.post('/admin/courses', payload(edit));
      toast.success('Course saved'); setEdit(null); load();
    } catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  const flip = async () => {
    setBusy(true);
    try {
      if (toggle.active) await api.delete(`/admin/courses/${toggle.id}`); else await api.put(`/admin/courses/${toggle.id}`, payload({ ...toggle, active: true }));
      toast.success(toggle.active ? 'Course deactivated' : 'Course activated'); setToggle(null); load();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const f = (name, label, extra = {}) => <Field label={label} name={name} value={edit[name]} onChange={set} error={errors[name]} required {...extra} />;

  return (
    <>
      <div className="portal-header mb">
        <h2>Courses &amp; Fee Structure</h2>
        <p className="muted">{isAdmin ? 'Add courses and update fees' : 'Read-only view (admin can edit)'}</p>
      </div>
      <div className="row between mb"><span className="muted small">Amounts in INR. “Payable at admission” = first-year tuition + admission fee + caution deposit + establishment + electricity.</span>
        {isAdmin && <button className="btn" onClick={() => setEdit({ ...BLANK })}>+ Add course</button>}</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Course</th><th>Dept.</th><th>Years</th><th className="num">Tuition/yr</th><th className="num">Admission</th><th className="num">Caution</th><th className="num">Estab.</th><th className="num">Electricity</th><th className="num">Payable</th><th>Status</th>{isAdmin && <th />}</tr></thead>
          <tbody>
            {data.courses.map((c) => (
              <tr key={c.id} style={c.active ? {} : { opacity: .55 }}>
                <td><b>{c.name}</b><div className="small muted">{c.code}</div></td><td>{c.department_code}</td><td>{c.duration_years}</td>
                <td className="num">{inr(c.tuition_fee_per_year)}</td><td className="num">{inr(c.admission_fee)}</td><td className="num">{inr(c.caution_deposit)}</td>
                <td className="num">{inr(c.establishment_fee)}</td><td className="num">{inr(c.electricity_fee_per_year)}</td><td className="num"><b>{inr(c.first_year_payable)}</b></td>
                <td><span className={`badge tone-${c.active ? 'green' : 'gray'}`}>{c.active ? 'Active' : 'Inactive'}</span></td>
                {isAdmin && <td><div className="row"><button className="btn btn-outline btn-sm" onClick={() => { setErrors({}); setEdit({ ...c, active: String(c.active), eligibility: c.eligibility || '' }); }}>Edit</button>
                  <button className="btn btn-outline btn-sm" onClick={() => setToggle(c)}>{c.active ? 'Deactivate' : 'Activate'}</button></div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {edit && (
        <Modal title={edit.id ? 'Edit course & fees' : 'Add course'} onClose={() => setEdit(null)}>
          <form onSubmit={save} noValidate>
            <div className="form-grid">
              {f('name', 'Course name')}{f('code', 'Course code')}
              {f('department_id', 'Department', { type: 'select', options: data.departments.map((d) => ({ value: d.id, label: d.name })) })}
              {f('degree', 'Degree', { type: 'select', options: ['B.E.', 'B.Tech', 'M.E.'].map((v) => ({ value: v, label: v })) })}
              {f('level', 'Level', { type: 'select', options: ['UG', 'PG'].map((v) => ({ value: v, label: v })) })}
              {f('duration_years', 'Duration (years)', { type: 'number', min: 1, max: 6 })}
              {f('active', 'Status', { type: 'select', options: [{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }] })}
            </div>
            {f('eligibility', 'Eligibility', { type: 'textarea', required: false })}
            <h4>Fees (INR)</h4>
            <div className="form-grid">
              {f('tuition_fee_per_year', 'Tuition fee per year', { type: 'number', min: 0 })}{f('admission_fee', 'Admission fee', { type: 'number', min: 0 })}
              {f('caution_deposit', 'Caution deposit', { type: 'number', min: 0 })}{f('establishment_fee', 'Establishment charges', { type: 'number', min: 0 })}
              {f('electricity_fee_per_year', 'Electricity charges / year', { type: 'number', min: 0 })}
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn btn-outline" onClick={() => setEdit(null)}>Cancel</button><button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button></div>
          </form>
        </Modal>
      )}
      {toggle && <ConfirmDialog title={toggle.active ? 'Deactivate course?' : 'Activate course?'} message={toggle.active ? 'Students will no longer see or select this course. Existing applications are not affected.' : 'Students will be able to select this course again.'} confirmLabel="Yes" busy={busy} onConfirm={flip} onCancel={() => setToggle(null)} />}
    </>
  );
}
