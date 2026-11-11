import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorMessage, openDocument } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog, FeeBreakdown, Spinner, StatusBadge, Tracker } from '../../components/ui';
import { categoryLabel, docLabel, fmtDate, inr } from '../../utils/format';

export default function ApplicationDetail() {
  const { id } = useParams();
  const toast = useToast();
  const [app, setApp] = useState(null);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(null); // {kind:'status'|'doc', ...}
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/admin/applications/${id}`).then((r) => setApp(r.data.application)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="alert alert-error">{error} <Link to="/admin/applications">Back to list</Link></div>;
  if (!app) return <Spinner />;

  const reviewable = ['SUBMITTED', 'UNDER_VERIFICATION'].includes(app.status);
  const s = app.student;

  const run = async (request, okMessage) => {
    setBusy(true);
    try { const { data } = await request(); setApp(data.application); toast.success(okMessage); setDialog(null); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  const setStatus = (status, remarks) => run(() => api.patch(`/admin/applications/${id}/status`, { status, remarks: remarks || undefined }), 'Status updated');
  const verifyDoc = (docId, status, remarks) => run(() => api.patch(`/admin/documents/${docId}`, { status, remarks: remarks || undefined }), `Document ${status.toLowerCase()}`);

  return (
    <>
      <div className="row between no-print"><Link to="/admin/applications">← Back to applications</Link><button className="btn btn-outline btn-sm" onClick={() => window.print()}>🖨 Print application</button></div>
      <div className="row between"><h2>{app.application_no}</h2><StatusBadge status={app.status} /></div>
      <div className="card mb"><Tracker status={app.status} />
        {app.remarks && <div className="alert alert-warn">Remarks: {app.remarks}</div>}
        <div className="row no-print">
          {app.status === 'SUBMITTED' && <button className="btn btn-sm" onClick={() => setStatus('UNDER_VERIFICATION')}>Start verification</button>}
          {app.status === 'UNDER_VERIFICATION' && <button className="btn btn-sm btn-green" onClick={() => setDialog({ kind: 'status', status: 'DOCUMENTS_VERIFIED', title: 'Mark documents as verified?', message: 'All required documents must already be verified.', tone: 'green' })}>Mark documents verified</button>}
          {app.status === 'DOCUMENTS_VERIFIED' && <button className="btn btn-sm btn-green" onClick={() => setDialog({ kind: 'status', status: 'APPROVED', title: 'Approve this application?', message: 'The student will be notified and can pay the admission fee.', tone: 'green' })}>Approve application</button>}
          {['SUBMITTED', 'UNDER_VERIFICATION', 'DOCUMENTS_VERIFIED'].includes(app.status) && <button className="btn btn-sm btn-red" onClick={() => setDialog({ kind: 'status', status: 'REJECTED', title: 'Reject this application?', message: 'The student will see the reason you enter.', tone: 'red', askReason: true })}>Reject application</button>}
        </div>
      </div>

      <div className="grid g2">
        <div className="card"><h3>Student details</h3>
          <dl className="kv"><dt>Name</dt><dd>{s.full_name}</dd><dt>Date of birth</dt><dd>{s.dob}</dd><dt>Gender</dt><dd>{s.gender}</dd><dt>Mobile</dt><dd>{s.mobile}</dd><dt>Email</dt><dd>{s.email}</dd>
            <dt>Address</dt><dd>{[s.address, s.city, s.state, s.pin_code].filter(Boolean).join(', ')}</dd>
            <dt>Guardian</dt><dd>{s.guardian_name} ({s.guardian_relation}) · {s.guardian_mobile}</dd><dt>Occupation</dt><dd>{s.guardian_occupation}</dd></dl></div>
        <div className="card"><h3>Academic &amp; course</h3>
          <dl className="kv"><dt>10th</dt><dd>{app.academic.tenth_school} · {app.academic.tenth_percentage}%</dd><dt>12th</dt><dd>{app.academic.twelfth_school} · {app.academic.twelfth_percentage}%</dd>
            <dt>Passing year</dt><dd>{app.academic.passing_year}</dd><dt>Qualification</dt><dd>{app.academic.previous_qualification}</dd>
            <dt>Course</dt><dd>{app.course?.name}</dd><dt>Department</dt><dd>{app.course?.department_name}</dd><dt>Category</dt><dd>{categoryLabel(app.admission_category)}</dd>
            <dt>Submitted</dt><dd>{fmtDate(app.submitted_at, true)}</dd></dl></div>
      </div>

      <div className="card mt"><h3>Document verification</h3>
        {!reviewable && <p className="muted small">Documents can be verified only while the application is Submitted or Under Verification.</p>}
        {app.documents.map((d) => (
          <div className="doc-row" key={d.id}>
            <div><b>{docLabel(d.doc_type)}</b><div className="small muted">{d.original_name} · {(d.size_bytes / 1024).toFixed(0)} KB</div>{d.remarks && <div className="small err">{d.remarks}</div>}</div>
            <div className="row">
              <span className={`badge tone-${d.status === 'VERIFIED' ? 'green' : d.status === 'REJECTED' ? 'red' : 'gray'}`}>{d.status}</span>
              <button className="btn btn-outline btn-sm" onClick={() => openDocument(d.id).catch((e) => toast.error(errorMessage(e)))}>View</button>
              {reviewable && d.status !== 'VERIFIED' && <button className="btn btn-green btn-sm" onClick={() => verifyDoc(d.id, 'VERIFIED')}>Verify</button>}
              {reviewable && d.status !== 'REJECTED' && <button className="btn btn-red btn-sm" onClick={() => setDialog({ kind: 'doc', docId: d.id, title: `Reject ${docLabel(d.doc_type)}?`, message: 'The student will be asked to upload a corrected file.', tone: 'red', askReason: true })}>Reject</button>}
            </div>
          </div>
        ))}
      </div>

      <div className="grid g2 mt">
        <div className="card"><h3>Fee structure</h3><FeeBreakdown fee={app.fee} duration={app.course?.duration_years} />
          {app.payment && <p className="alert alert-ok mt">Paid {inr(app.payment.amount)} via {app.payment.method} · Receipt {app.payment.receipt_no}</p>}</div>
        <div className="card"><h3>Status history</h3>
          <ul className="timeline">{[...app.history].reverse().map((h) => <li key={h.id}><StatusBadge status={h.to_status} /> <span className="small muted">{fmtDate(h.changed_at, true)} · {h.changed_by || 'System'}</span>{h.remarks && <div className="small">{h.remarks}</div>}</li>)}</ul></div>
      </div>

      {dialog && <ConfirmDialog title={dialog.title} message={dialog.message} tone={dialog.tone} askReason={dialog.askReason} busy={busy} confirmLabel="Confirm"
        onConfirm={(reason) => (dialog.kind === 'doc' ? verifyDoc(dialog.docId, 'REJECTED', reason) : setStatus(dialog.status, reason))} onCancel={() => setDialog(null)} />}
    </>
  );
}
