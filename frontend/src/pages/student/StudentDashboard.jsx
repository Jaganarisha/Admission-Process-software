import { Link } from 'react-router-dom';
import { Spinner, StatusBadge, Tracker } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useMyApplication } from '../../services/hooks';
import { fmtDate, inr } from '../../utils/format';

const NEXT = {
  DRAFT: ['Complete your application', 'Fill in all sections, upload your documents and submit.', '/student/apply/personal', 'Continue application'],
  SUBMITTED: ['Waiting for verification', 'The admission office will start verifying your application shortly.', '/student/status', 'View status'],
  UNDER_VERIFICATION: ['Verification in progress', 'Check your documents - any rejected file must be uploaded again.', '/student/status', 'View status'],
  DOCUMENTS_VERIFIED: ['Documents verified', 'Your application is awaiting the final approval decision.', '/student/status', 'View status'],
  APPROVED: ['Application approved', 'Congratulations! Proceed to pay the admission fee.', '/student/payment', 'Pay fee'],
  FEE_PENDING: ['Pay your admission fee', 'Your application is approved. Pay the fee to confirm your seat.', '/student/payment', 'Pay fee now'],
  REJECTED: ['Application rejected', 'See the remarks on the status page. You can contact the admission office for help.', '/student/status', 'View remarks'],
  ADMISSION_CONFIRMED: ['Admission confirmed 🎉', 'Download or print your admission confirmation letter and fee receipt.', '/student/confirmation', 'Open confirmation'],
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const { app, loading, error } = useMyApplication();
  return (
    <>
      <div className="portal-header mb">
        <h2>Welcome, {user.name}</h2>
        <p className="muted">Bharathidasan Engineering College · Student dashboard</p>
      </div>
      {loading && <Spinner />}
      {error && <div className="alert alert-error">{error}</div>}
      {app && (() => {
        const [title, text, to, cta] = NEXT[app.status];
        return (
          <>
            <div className="card mb">
              <div className="row between"><h3 style={{ margin: 0 }}>Application status</h3><StatusBadge status={app.status} /></div>
              <Tracker status={app.status} />
              <div className="alert alert-info" style={{ marginBottom: 0 }}>
                <b>{title}</b><br />{text}<div className="mt"><Link to={to} className="btn btn-sm">{cta}</Link></div>
              </div>
            </div>
            <div className="grid g3">
              <div className="card stat"><div className="muted small">Application number</div><div className="n" style={{ fontSize: '1.4rem' }}>{app.application_no || 'Not generated yet'}</div></div>
              <div className="card stat green"><div className="muted small">Selected course</div><b>{app.course?.name || 'Not selected'}</b></div>
              <div className="card stat gold">
                <div className="muted small">Fee payable at admission</div>
                <div className="n" style={{ fontSize: '1.4rem' }}>{app.fee ? inr(app.fee.first_year_payable) : '-'}</div>
                {app.fee?.concession_applied && <div className="small green" style={{ fontWeight: 600 }}>50% Govt. quota concession</div>}
              </div>
            </div>
            <p className="muted small mt">Last updated {fmtDate(app.updated_at, true)}</p>
          </>
        );
      })()}
    </>
  );
}
