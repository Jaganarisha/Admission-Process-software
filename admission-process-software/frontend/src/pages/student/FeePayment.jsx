import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../../services/api';
import { useMyApplication } from '../../services/hooks';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog, FeeBreakdown, Spinner } from '../../components/ui';
import { inr } from '../../utils/format';

const METHODS = [['UPI', 'UPI'], ['CARD', 'Debit / Credit card'], ['NETBANKING', 'Net banking']];

export default function FeePayment() {
  const { app, loading, error } = useMyApplication();
  const toast = useToast();
  const navigate = useNavigate();
  const [method, setMethod] = useState('UPI');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (loading) return <Spinner />;
  if (error) return <div className="alert alert-error">{error}</div>;

  const pay = async () => {
    setBusy(true);
    try {
      await api.post('/student/applications/me/pay', { method });
      toast.success('Payment successful. Your admission is confirmed!');
      navigate('/student/confirmation');
    } catch (e) { toast.error(errorMessage(e)); setConfirm(false); } finally { setBusy(false); }
  };

  return (
    <>
      <h2>Fee Payment</h2>
      {app.status === 'ADMISSION_CONFIRMED' && <div className="alert alert-ok">Fee already paid. <Link to="/student/confirmation">View receipt &amp; confirmation →</Link></div>}
      {!['FEE_PENDING', 'ADMISSION_CONFIRMED'].includes(app.status) && (
        <div className="alert alert-info">Fee payment opens after your application is approved. Current status: <b>{app.status.replace(/_/g, ' ').toLowerCase()}</b>. <Link to="/student/status">Track status</Link></div>
      )}
      {app.fee && (
        <div className="card fee-card">
          <h3>{app.course.name}</h3>
          <FeeBreakdown fee={app.fee} duration={app.course.duration_years} />
          {app.status === 'FEE_PENDING' && (
            <>
              <h4 className="mt">Payment method</h4>
              <div className="row" role="radiogroup" aria-label="Payment method">
                {METHODS.map(([v, l]) => (
                  <label key={v} className="row" style={{ gap: '.4rem' }}><input type="radio" name="method" value={v} checked={method === v} onChange={() => setMethod(v)} /> {l}</label>
                ))}
              </div>
              <div className="alert alert-warn mt">Demo gateway: payments succeed instantly and no real money is charged. The payment module is structured so a real gateway (e.g. Razorpay) can be plugged in.</div>
              <button className="btn btn-green" onClick={() => setConfirm(true)}>Pay {inr(app.fee.first_year_payable)}</button>
            </>
          )}
        </div>
      )}
      {confirm && <ConfirmDialog title="Confirm payment" message={`Pay ${inr(app.fee.first_year_payable)} via ${METHODS.find((m) => m[0] === method)[1]} to confirm your admission?`} confirmLabel="Pay now" tone="green" busy={busy} onConfirm={pay} onCancel={() => setConfirm(false)} />}
    </>
  );
}
