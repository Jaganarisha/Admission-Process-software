import { Link } from 'react-router-dom';
import { Spinner } from '../../components/ui';
import { useMyApplication } from '../../services/hooks';
import { COLLEGE } from '../../config/college';
import { FEE_LABELS, categoryLabel, fmtDate, inr } from '../../utils/format';

export default function Confirmation() {
  const { app, loading, error } = useMyApplication();
  if (loading) return <Spinner />;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (app.status !== 'ADMISSION_CONFIRMED' || !app.payment) {
    return (
      <>
        <h2>Admission Confirmation</h2>
        <div className="alert alert-info">Your confirmation letter is available once your admission fee has been paid. <Link to="/student/status">Track status</Link></div>
      </>
    );
  }
  const p = app.payment;
  return (
    <>
      <div className="row between no-print"><h2>Admission Confirmation</h2><button className="btn" onClick={() => window.print()}>🖨 Print / Download PDF</button></div>
      <p className="muted small no-print">In the print dialog choose “Save as PDF” to download a copy.</p>
      <div className="letter">
        <div className="letter-head">
          <img src="/images/bec-logo.png" alt="" />
          <div><h2 style={{ margin: 0 }}>{COLLEGE.name}</h2><div className="small">{COLLEGE.address}</div><div className="small muted">{COLLEGE.tagline}</div></div>
        </div>
        <h3 className="center">ADMISSION CONFIRMATION &amp; FEE RECEIPT</h3>
        <p>This is to certify that <b>{app.student.full_name}</b> has been admitted to <b>{app.course.name}</b> ({app.course.department_name}) for the academic year <b>{app.academic_year}</b>.</p>
        <dl className="kv">
          <dt>Application no.</dt><dd>{app.application_no}</dd>
          <dt>Admission category</dt><dd>{categoryLabel(app.admission_category)}{app.admission_category === 'GOVERNMENT' ? ' (50% Fee Concession Applied)' : ''}</dd>
          <dt>Date of birth</dt><dd>{app.student.dob}</dd>
          <dt>Guardian</dt><dd>{app.student.guardian_name} ({app.student.guardian_relation})</dd>
          <dt>Receipt no.</dt><dd>{p.receipt_no}</dd>
          <dt>Transaction ref.</dt><dd>{p.transaction_ref}</dd>
          <dt>Paid on</dt><dd>{fmtDate(p.paid_at, true)} via {p.method}</dd>
        </dl>
        <div className="table-wrap mt">
          {app.admission_category === 'GOVERNMENT' && (
            <div className="alert alert-ok mb small" style={{ marginBottom: '.5rem', padding: '.4rem .75rem' }}>
              🏷️ <b>50% Government Quota Concession:</b> Fees are charged at half the standard rate under TNEA / counselling quota.
            </div>
          )}
          <table>
            <tbody>{Object.entries(p.breakdown).map(([k, v]) => <tr key={k}><td>{FEE_LABELS[k] || k}</td><td className="num">{inr(v)}</td></tr>)}</tbody>
            <tfoot><tr><td>Total paid</td><td className="num">{inr(p.amount)}</td></tr></tfoot>
          </table>
        </div>
        <p className="small muted mt">This is a computer-generated document. Please carry original certificates for verification at the time of joining.</p>
      </div>
    </>
  );
}
