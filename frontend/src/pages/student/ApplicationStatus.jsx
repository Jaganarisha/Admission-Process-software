import { Link } from 'react-router-dom';
import { Spinner, StatusBadge, Tracker } from '../../components/ui';
import { useMyApplication } from '../../services/hooks';
import { docLabel, fmtDate } from '../../utils/format';

export default function ApplicationStatus() {
  const { app, loading, error } = useMyApplication();
  if (loading) return <Spinner />;
  if (error) return <div className="alert alert-error">{error}</div>;
  const rejectedDocs = app.documents.filter((d) => d.status === 'REJECTED');
  return (
    <>
      <div className="row between"><h2>Application Status</h2><StatusBadge status={app.status} /></div>
      <div className="card mb">
        <dl className="kv">
          <dt>Application no.</dt><dd>{app.application_no || 'Not generated yet (submit your application)'}</dd>
          <dt>Course</dt><dd>{app.course?.name || '-'}</dd>
          <dt>Submitted on</dt><dd>{fmtDate(app.submitted_at, true)}</dd>
          <dt>Academic year</dt><dd>{app.academic_year}</dd>
        </dl>
        <Tracker status={app.status} />
        {app.status === 'REJECTED' && <div className="alert alert-error">Your application was rejected. Reason: {app.remarks || 'Not specified'}</div>}
        {rejectedDocs.length > 0 && app.status !== 'REJECTED' && (
          <div className="alert alert-warn">Some documents were rejected. <Link to="/student/apply/documents">Upload corrected files →</Link></div>
        )}
        {app.status === 'DRAFT' && <Link className="btn" to="/student/apply/personal">Continue application</Link>}
        {app.status === 'FEE_PENDING' && <Link className="btn btn-green" to="/student/payment">Pay admission fee</Link>}
        {app.status === 'ADMISSION_CONFIRMED' && <Link className="btn btn-green" to="/student/confirmation">Open confirmation</Link>}
      </div>

      <div className="grid g2">
        <div className="card">
          <h3>Documents</h3>
          {app.documents.length === 0 ? <p className="muted">No documents uploaded yet.</p> : app.documents.map((d) => (
            <div className="doc-row" key={d.id}>
              <div><b>{docLabel(d.doc_type)}</b>{d.remarks && <div className="small err">{d.remarks}</div>}</div>
              <span className={`badge tone-${d.status === 'VERIFIED' ? 'green' : d.status === 'REJECTED' ? 'red' : 'gray'}`}>{d.status === 'PENDING' ? 'Pending review' : d.status === 'VERIFIED' ? 'Verified' : 'Rejected'}</span>
            </div>
          ))}
        </div>
        <div className="card">
          <h3>Status history</h3>
          {app.history.length === 0 ? <p className="muted">History will appear after submission.</p> : (
            <ul className="timeline">
              {[...app.history].reverse().map((h) => (
                <li key={h.id}><StatusBadge status={h.to_status} /> <span className="muted small">{fmtDate(h.changed_at, true)}</span>
                  {h.remarks && <div className="small">{h.remarks}</div>}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
