import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import api, { errorMessage, fieldErrors, openDocument } from '../../services/api';
import { useMyApplication } from '../../services/hooks';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog, Field, FeeBreakdown, Spinner, StatusBadge } from '../../components/ui';
import { CATEGORIES, DOC_TYPES, categoryLabel, fmtDate } from '../../utils/format';

const STEPS = [
  { key: 'personal', label: '1. Personal & Guardian' },
  { key: 'academic', label: '2. Academic' },
  { key: 'course', label: '3. Course' },
  { key: 'documents', label: '4. Documents' },
  { key: 'review', label: '5. Review & Submit' },
];
const FIELDS = {
  personal: ['full_name', 'dob', 'gender', 'mobile', 'email', 'address', 'city', 'state', 'pin_code', 'guardian_name', 'guardian_relation', 'guardian_mobile', 'guardian_occupation'],
  academic: ['tenth_school', 'tenth_percentage', 'twelfth_school', 'twelfth_percentage', 'passing_year', 'previous_qualification'],
  course: ['course_id', 'admission_category'],
};
const MAX = 2 * 1024 * 1024;
const GENDERS = ['Male', 'Female', 'Other'].map((v) => ({ value: v, label: v }));

export default function ApplicationForm() {
  const { step } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { app, setApp, loading, error, reload } = useMyApplication();
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [courses, setCourses] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [submitIssues, setSubmitIssues] = useState(null);

  useEffect(() => { api.get('/courses').then((r) => setCourses(r.data.courses)).catch(() => {}); }, []);
  useEffect(() => {
    if (!app) return;
    const flat = { ...app.student, ...app.academic, course_id: app.course_id, admission_category: app.admission_category };
    setForm(Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v ?? ''])));
  }, [app?.id, app?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const idx = STEPS.findIndex((s) => s.key === step);
  const editable = app?.status === 'DRAFT';
  const course = useMemo(() => courses.find((c) => String(c.id) === String(form.course_id)), [courses, form.course_id]);

  const isGov = useMemo(() => {
    const c = form.admission_category;
    if (!c) return false;
    const s = String(c).trim().toUpperCase();
    return s === 'GOVERNMENT' || s.startsWith('GOVERNMENT') || s.includes('TNEA') || s.includes('COUNSELLING');
  }, [form.admission_category]);

  const courseFee = useMemo(() => {
    if (!course) return null;
    if (!isGov) return course;
    const factor = 0.5;
    const tuition_fee_per_year = Math.round((Number(course.tuition_fee_per_year) || 0) * factor);
    const admission_fee = Math.round((Number(course.admission_fee) || 0) * factor);
    const caution_deposit = Math.round((Number(course.caution_deposit) || 0) * factor);
    const establishment_fee = Math.round((Number(course.establishment_fee) || 0) * factor);
    const electricity_fee_per_year = Math.round((Number(course.electricity_fee_per_year) || 0) * factor);
    const first_year_payable = tuition_fee_per_year + admission_fee + caution_deposit + establishment_fee + electricity_fee_per_year;
    const total_tuition = tuition_fee_per_year * (Number(course.duration_years) || 4);
    return {
      ...course,
      tuition_fee_per_year,
      admission_fee,
      caution_deposit,
      establishment_fee,
      electricity_fee_per_year,
      first_year_payable,
      total_tuition,
      concession_applied: true,
      concession_rate: 0.5,
      original_fee: {
        tuition_fee_per_year: course.tuition_fee_per_year,
        admission_fee: course.admission_fee,
        caution_deposit: course.caution_deposit,
        establishment_fee: course.establishment_fee,
        electricity_fee_per_year: course.electricity_fee_per_year,
        total_tuition: course.total_tuition,
        first_year_payable: course.first_year_payable,
      },
    };
  }, [course, isGov]);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const fp = (name, label, extra = {}) => <Field label={label} name={name} value={form[name]} onChange={set} error={errors[name]} disabled={!editable} required {...extra} />;

  if (idx < 0) return <Navigate to="/student/apply/personal" replace />;
  if (loading) return <Spinner />;
  if (error) return <div className="alert alert-error">{error}</div>;

  const saveStep = async (goNext = true) => {
    const keys = FIELDS[step];
    if (!keys || !editable) return navigate(`/student/apply/${STEPS[idx + 1].key}`);
    setBusy(true); setErrors({});
    try {
      const body = Object.fromEntries(keys.map((k) => [k, form[k]]));
      const { data } = await api.put('/student/applications/me', body);
      setApp(data.application);
      toast.success('Saved');
      if (goNext) navigate(`/student/apply/${STEPS[idx + 1].key}`);
    } catch (e) { setErrors(fieldErrors(e)); toast.error(errorMessage(e)); } finally { setBusy(false); }
  };

  const upload = async (type, file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) return toast.error('Only JPG, PNG or PDF files are allowed');
    if (type === 'PHOTO' && file.type === 'application/pdf') return toast.error('Photograph must be a JPG or PNG image');
    if (file.size > MAX) return toast.error('File is too large (max 2 MB)');
    const fd = new FormData();
    fd.append('doc_type', type); fd.append('file', file);
    try { await api.post('/student/applications/me/documents', fd); toast.success('Document uploaded'); await reload(); }
    catch (e) { toast.error(errorMessage(e)); }
  };
  const removeDoc = async (id) => {
    try { await api.delete(`/student/applications/me/documents/${id}`); await reload(); } catch (e) { toast.error(errorMessage(e)); }
  };
  const view = (id) => openDocument(id).catch((e) => toast.error(errorMessage(e)));

  const submit = async () => {
    setBusy(true); setSubmitIssues(null);
    try {
      const { data } = await api.post('/student/applications/me/submit');
      setApp(data.application); setConfirm(false);
      toast.success(`Application submitted. Your application number is ${data.application.application_no}`);
      navigate('/student/status');
    } catch (e) {
      setConfirm(false);
      setSubmitIssues({ message: errorMessage(e), errors: fieldErrors(e), missing: e.response?.data?.missing });
    } finally { setBusy(false); }
  };

  const docOf = (t) => app.documents.find((d) => d.doc_type === t);

  return (
    <>
      <div className="row between"><h2>Admission Application</h2><StatusBadge status={app.status} /></div>
      <nav className="stepper" aria-label="Application steps">
        {STEPS.map((s, i) => <Link key={s.key} to={`/student/apply/${s.key}`} className={i === idx ? 'current' : i < idx ? 'done' : ''}>{s.label}</Link>)}
      </nav>
      {!editable && <div className="alert alert-warn">This application has been submitted and can no longer be edited. You can still re-upload any document that was rejected.</div>}

      {step === 'personal' && (
        <div className="card">
          <h3>Personal details</h3>
          <div className="form-grid">
            {fp('full_name', 'Student name')}
            {fp('dob', 'Date of birth', { type: 'date', max: new Date().toISOString().slice(0, 10) })}
            {fp('gender', 'Gender', { type: 'select', options: GENDERS })}
            {fp('mobile', 'Mobile number', { type: 'tel', maxLength: 10 })}
            {fp('email', 'Email', { type: 'email' })}
            {fp('city', 'City')}
            {fp('state', 'State')}
            {fp('pin_code', 'PIN code', { maxLength: 6, inputMode: 'numeric' })}
          </div>
          {fp('address', 'Address', { type: 'textarea' })}
          <h3 className="mt">Parent / guardian details</h3>
          <div className="form-grid">
            {fp('guardian_name', 'Parent / guardian name')}
            {fp('guardian_relation', 'Relationship')}
            {fp('guardian_mobile', 'Guardian mobile number', { type: 'tel', maxLength: 10 })}
            {fp('guardian_occupation', 'Occupation')}
          </div>
        </div>
      )}

      {step === 'academic' && (
        <div className="card">
          <h3>Academic details</h3>
          <div className="form-grid">
            {fp('tenth_school', '10th school')}
            {fp('tenth_percentage', '10th percentage', { type: 'number', min: 0, max: 100, step: '0.01' })}
            {fp('twelfth_school', '12th school')}
            {fp('twelfth_percentage', '12th percentage', { type: 'number', min: 0, max: 100, step: '0.01' })}
            {fp('passing_year', 'Passing year', { type: 'number', min: 1990, max: new Date().getFullYear() + 1 })}
            {fp('previous_qualification', 'Previous qualification', { placeholder: 'e.g. Higher Secondary (HSC) / Diploma' })}
          </div>
        </div>
      )}

      {step === 'course' && (
        <div className="card">
          <h3>Course selection</h3>
          <div className="form-grid">
            {fp('course_id', 'Course', { type: 'select', options: courses.map((c) => ({ value: c.id, label: `${c.name} (${c.duration_years} yrs)` })) })}
            <Field label="Department" name="dept" value={course?.department_name || ''} disabled onChange={() => {}} />
            {fp('admission_category', 'Admission category', { type: 'select', options: CATEGORIES })}
            {isGov && (
              <div className="alert alert-ok mt small" style={{ gridColumn: '1 / -1', margin: 0 }}>
                🏷️ <b>Government Quota Selected:</b> A 50% concession is applied to all tuition and admission fees.
              </div>
            )}
          </div>
          {course && <><h4 className="mt">Fee structure for this course</h4><FeeBreakdown fee={courseFee} duration={course.duration_years} /></>}
        </div>
      )}

      {step === 'documents' && (
        <div className="card">
          <h3>Upload documents</h3>
          <p className="muted small">JPG, PNG or PDF · maximum 2 MB per file. Documents marked * are required.</p>
          {DOC_TYPES.map((d) => {
            const doc = docOf(d.type);
            const canUpload = editable || doc?.status === 'REJECTED';
            return (
              <div className="doc-row" key={d.type}>
                <div>
                  <b>{d.label}{d.required && ' *'}</b>
                  {doc ? <div className="small muted">{doc.original_name} · {(doc.size_bytes / 1024).toFixed(0)} KB · {fmtDate(doc.uploaded_at)}</div> : <div className="small muted">Not uploaded {d.hint && `(${d.hint})`}</div>}
                  {doc?.status === 'REJECTED' && <div className="err">Rejected: {doc.remarks} - please upload a corrected file.</div>}
                </div>
                <div className="row">
                  {doc && <span className={`badge tone-${doc.status === 'VERIFIED' ? 'green' : doc.status === 'REJECTED' ? 'red' : 'gray'}`}>{doc.status === 'PENDING' ? 'Uploaded' : doc.status === 'VERIFIED' ? 'Verified' : 'Rejected'}</span>}
                  {doc && <button type="button" className="btn btn-outline btn-sm" onClick={() => view(doc.id)}>View</button>}
                  {canUpload && (
                    <label className="btn btn-sm btn-gold" style={{ cursor: 'pointer' }}>
                      {doc ? 'Replace' : 'Choose file'}
                      <input type="file" hidden accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => { upload(d.type, e.target.files[0]); e.target.value = ''; }} />
                    </label>
                  )}
                  {doc && editable && <button type="button" className="btn btn-outline btn-sm" onClick={() => removeDoc(doc.id)}>Remove</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {step === 'review' && (
        <div className="card">
          <h3>Review your application</h3>
          {submitIssues && (
            <div className="alert alert-error" role="alert">
              <b>{submitIssues.message}</b>
              {Object.keys(submitIssues.errors).length > 0 && <ul>{Object.entries(submitIssues.errors).map(([k, v]) => <li key={k}>{k.replace(/_/g, ' ')}: {v}</li>)}</ul>}
              {submitIssues.missing && <ul>{submitIssues.missing.map((m) => <li key={m}>Missing document: {DOC_TYPES.find((d) => d.type === m)?.label}</li>)}</ul>}
            </div>
          )}
          <div className="grid g2">
            <dl className="kv">
              <dt>Name</dt><dd>{form.full_name || '-'}</dd><dt>Date of birth</dt><dd>{form.dob || '-'}</dd><dt>Gender</dt><dd>{form.gender || '-'}</dd>
              <dt>Mobile</dt><dd>{form.mobile || '-'}</dd><dt>Email</dt><dd>{form.email || '-'}</dd>
              <dt>Address</dt><dd>{[form.address, form.city, form.state, form.pin_code].filter(Boolean).join(', ') || '-'}</dd>
              <dt>Guardian</dt><dd>{form.guardian_name ? `${form.guardian_name} (${form.guardian_relation})` : '-'}</dd>
            </dl>
            <dl className="kv">
              <dt>10th</dt><dd>{form.tenth_school || '-'} · {form.tenth_percentage || '-'}%</dd>
              <dt>12th</dt><dd>{form.twelfth_school || '-'} · {form.twelfth_percentage || '-'}%</dd>
              <dt>Passing year</dt><dd>{form.passing_year || '-'}</dd><dt>Qualification</dt><dd>{form.previous_qualification || '-'}</dd>
              <dt>Course</dt><dd>{course?.name || '-'}</dd><dt>Department</dt><dd>{course?.department_name || '-'}</dd><dt>Category</dt><dd>{categoryLabel(form.admission_category)}</dd>
              <dt>Documents</dt><dd>{app.documents.length} uploaded</dd>
            </dl>
          </div>
          {course && <><h4 className="mt">Fee payable after approval</h4><FeeBreakdown fee={courseFee} duration={course.duration_years} /></>}
          {editable && <div className="mt"><button className="btn btn-green" onClick={() => setConfirm(true)}>Submit application</button></div>}
        </div>
      )}

      <div className="row between mt no-print">
        <button className="btn btn-outline" disabled={idx === 0} onClick={() => navigate(`/student/apply/${STEPS[idx - 1].key}`)}>← Back</button>
        {step !== 'review' && (
          <div className="row">
            {FIELDS[step] && editable && <button className="btn btn-outline" disabled={busy} onClick={() => saveStep(false)}>Save draft</button>}
            <button className="btn" disabled={busy} onClick={() => saveStep(true)}>{busy ? 'Saving...' : 'Save & continue →'}</button>
          </div>
        )}
      </div>
      {confirm && <ConfirmDialog title="Submit application?" message="After submission you cannot edit your details. An application number will be generated." confirmLabel="Yes, submit" tone="green" busy={busy} onConfirm={submit} onCancel={() => setConfirm(false)} />}
    </>
  );
}
