import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import api, { errorMessage, fieldErrors } from '../../services/api';

function ForgotPasswordCard({ portal = 'student' }) {
  const staff = portal === 'staff';
  const toast = useToast();
  const navigate = useNavigate();

  // Reset method: 'email' or 'phone'
  const [method, setMethod] = useState('email');

  // Multi-step flow: 'request' -> 'reset' -> 'success'
  const [step, setStep] = useState('request');

  const [form, setForm] = useState({
    email: '',
    mobile: '',
    code: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [destinationInfo, setDestinationInfo] = useState({
    message: '',
    maskedEmail: '',
    maskedPhone: '',
    deliveryMethod: '',
  });

  const [devHint, setDevHint] = useState('');
  const [error, setError] = useState('');
  const [fieldErr, setFieldErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const updateField = (e) => {
    const { name, value } = e.target;
    // For mobile, only allow digits up to 10
    if (name === 'mobile') {
      const cleaned = value.replace(/\D/g, '').slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: cleaned }));
    } else if (name === 'code') {
      const cleaned = value.replace(/\D/g, '').slice(0, 6);
      setForm((prev) => ({ ...prev, [name]: cleaned }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }

    if (fieldErr[name]) {
      setFieldErr((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Step 1: Request 6-digit OTP code via Email or Phone Number
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErr({});

    if (method === 'phone') {
      const cleanMobile = form.mobile.trim();
      if (!cleanMobile) {
        setFieldErr({ mobile: 'Please enter your registered 10-digit phone number' });
        return;
      }
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        setFieldErr({ mobile: 'Enter a valid 10-digit mobile number starting with 6-9' });
        return;
      }
    } else {
      const cleanEmail = form.email.trim();
      if (!cleanEmail) {
        setFieldErr({ email: 'Please enter your registered email address' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setFieldErr({ email: 'Enter a valid email address' });
        return;
      }
    }

    setBusy(true);
    try {
      const payload = { portal };
      if (method === 'phone') {
        payload.mobile = form.mobile.trim();
        payload.identifier = form.mobile.trim();
      } else {
        payload.email = form.email.trim();
        payload.identifier = form.email.trim();
      }

      const { data } = await api.post('/auth/forgot-password', payload);
      toast.success('Verification OTP code sent!');

      setDestinationInfo({
        message: data.message,
        maskedEmail: data.maskedEmail,
        maskedPhone: data.maskedPhone,
        deliveryMethod: data.deliveryMethod,
      });

      if (data.devCode) {
        setDevHint(data.devCode);
        setForm((prev) => ({ ...prev, code: data.devCode }));
      }

      setResendCooldown(30);
      setStep('reset');
    } catch (err) {
      setError(errorMessage(err));
      setFieldErr(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  // Resend OTP handler
  const handleResendCode = async () => {
    if (resendCooldown > 0 || busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = { portal };
      if (method === 'phone') {
        payload.mobile = form.mobile.trim();
        payload.identifier = form.mobile.trim();
      } else {
        payload.email = form.email.trim();
        payload.identifier = form.email.trim();
      }

      const { data } = await api.post('/auth/forgot-password', payload);
      toast.success('A new OTP has been sent!');
      if (data.devCode) {
        setDevHint(data.devCode);
        setForm((prev) => ({ ...prev, code: data.devCode }));
      }
      setResendCooldown(30);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // Step 2: Submit password reset (via OTP verification)
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErr({});

    if (!form.code || form.code.trim().length !== 6) {
      setFieldErr({ code: 'Please enter the 6-digit OTP code' });
      return;
    }

    if (!form.newPassword) {
      setFieldErr({ newPassword: 'New password is required' });
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setFieldErr({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setBusy(true);
    try {
      const payload = {
        portal,
        code: form.code.trim(),
        newPassword: form.newPassword,
      };

      if (method === 'phone') {
        payload.mobile = form.mobile.trim();
        payload.identifier = form.mobile.trim();
      } else {
        payload.email = form.email.trim();
        payload.identifier = form.email.trim();
      }

      await api.post('/auth/reset-password', payload);
      toast.success('Password reset successfully!');
      setStep('success');
    } catch (err) {
      setError(errorMessage(err));
      setFieldErr(fieldErrors(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className={`auth-card${staff ? ' staff' : ''}`}>
        <img
          className="auth-logo"
          src="/images/bec-logo.png"
          alt="Bharathidasan Engineering College logo"
        />
        <h1>{staff ? 'Staff / Admin Password Reset' : 'Student Password Reset'}</h1>
        <p className="sub">Bharathidasan Engineering College, Nattrampalli</p>

        {error && <div className="alert alert-error" role="alert">{error}</div>}

        {step === 'success' ? (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3.25rem', marginBottom: '0.75rem' }}>✅</div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--green, #16a34a)' }}>
              Password Reset Successfully!
            </h2>
            <p className="muted" style={{ marginBottom: '1.5rem', fontSize: '0.92rem' }}>
              Your account password has been updated. You can now log in using your new password.
            </p>
            <button
              type="button"
              className={`btn ${staff ? 'btn-red' : ''}`}
              style={{ width: '100%' }}
              onClick={() => navigate(staff ? '/admin/login' : '/login')}
            >
              Continue to Login
            </button>
          </div>
        ) : (
          <>
            {step === 'request' && (
              <>
                <div className="reset-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={method === 'email'}
                    className={`reset-tab-btn${method === 'email' ? ' active' : ''}`}
                    onClick={() => {
                      setMethod('email');
                      setError('');
                      setFieldErr({});
                    }}
                  >
                    <span>📧</span> Via Email ID
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={method === 'phone'}
                    className={`reset-tab-btn${method === 'phone' ? ' active' : ''}`}
                    onClick={() => {
                      setMethod('phone');
                      setError('');
                      setFieldErr({});
                    }}
                  >
                    <span>📱</span> Via Phone Number
                  </button>
                </div>

                <form onSubmit={handleRequestCode}>
                  {method === 'email' ? (
                    <>
                      <p className="muted small" style={{ marginBottom: '1rem' }}>
                        Enter your registered {staff ? 'staff / administrator' : 'student'} email address. We will send a 6-digit OTP verification code to reset your password.
                      </p>
                      <Field
                        label="Registered Email Address"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={updateField}
                        error={fieldErr.email}
                        required
                        autoComplete="email"
                        placeholder="name@example.com"
                        hint="We will deliver a 6-digit OTP to this email"
                      />
                    </>
                  ) : (
                    <>
                      <p className="muted small" style={{ marginBottom: '1rem' }}>
                        Enter your registered 10-digit mobile number. We will send a 6-digit OTP verification code to reset your password.
                      </p>
                      <div className={`field${fieldErr.mobile ? ' has-error' : ''}`}>
                        <div className="field-header">
                          <label htmlFor="f-mobile">
                            Registered Phone / Mobile Number<span className="req"> *</span>
                          </label>
                        </div>
                        <div className="phone-input-group">
                          <span className="phone-addon">+91</span>
                          <input
                            id="f-mobile"
                            name="mobile"
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            value={form.mobile}
                            onChange={updateField}
                            placeholder="10-digit mobile number"
                            autoComplete="tel"
                            required
                          />
                        </div>
                        {fieldErr.mobile ? (
                          <span className="err" role="alert">{fieldErr.mobile}</span>
                        ) : (
                          <span className="muted small">Enter the 10-digit mobile number registered with your account</span>
                        )}
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    className={`btn ${staff ? 'btn-red' : ''}`}
                    style={{ width: '100%', marginTop: '1rem' }}
                    disabled={busy}
                  >
                    {busy ? 'Sending OTP...' : method === 'phone' ? '📱 Get OTP on Phone' : '📧 Get OTP on Email'}
                  </button>
                </form>
              </>
            )}

            {step === 'reset' && (
              <form onSubmit={handleResetPassword}>
                <div className="otp-destination-box">
                  <span style={{ fontSize: '1.25rem' }}>{method === 'phone' ? '📱' : '📩'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>
                      OTP sent to your {method === 'phone' ? 'registered phone number' : 'registered email'}:
                    </div>
                    <div style={{ color: '#475569', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                      {method === 'phone'
                        ? (destinationInfo.maskedPhone || `+91 ${form.mobile}`)
                        : (destinationInfo.maskedEmail || form.email)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-link"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      padding: '0.2rem 0.4rem',
                      color: staff ? 'var(--red)' : 'var(--navy)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                    onClick={() => {
                      setStep('request');
                      setError('');
                      setFieldErr({});
                    }}
                  >
                    Change
                  </button>
                </div>

                {devHint && (
                  <div className="dev-otp-card">
                    <div className="dev-otp-header">
                      <span style={{ fontSize: '0.86rem', color: '#0369a1', fontWeight: 600 }}>
                        ⚡ Development Mode Helper
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: '0.78rem', padding: '0.2rem 0.5rem' }}
                        onClick={() => setForm((prev) => ({ ...prev, code: devHint }))}
                      >
                        Auto-fill OTP
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.84rem', color: '#0f172a' }}>Your 6-digit OTP:</span>
                      <span className="dev-code-badge">{devHint}</span>
                    </div>
                  </div>
                )}

                <div className={`field${fieldErr.code ? ' has-error' : ''}`}>
                  <div className="field-header">
                    <label htmlFor="f-code">
                      6-Digit Verification OTP<span className="req"> *</span>
                    </label>
                  </div>
                  <input
                    id="f-code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.code}
                    onChange={updateField}
                    className="code-input"
                    placeholder="123456"
                    autoComplete="one-time-code"
                    required
                  />
                  {fieldErr.code && <span className="err" role="alert">{fieldErr.code}</span>}

                  <div className="otp-resend-row">
                    <span className="muted">Didn't receive the OTP?</span>
                    {resendCooldown > 0 ? (
                      <span className="muted">Resend available in {resendCooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        className="btn-link"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontWeight: 600,
                          color: staff ? 'var(--red)' : 'var(--navy)',
                          padding: 0,
                        }}
                        onClick={handleResendCode}
                        disabled={busy}
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </div>

                <Field
                  label="New Password"
                  name="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={updateField}
                  error={fieldErr.newPassword}
                  required
                  autoComplete="new-password"
                  hint="At least 8 characters with uppercase, lowercase and a number"
                />

                <Field
                  label="Confirm New Password"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={updateField}
                  error={fieldErr.confirmPassword}
                  required
                  autoComplete="new-password"
                />

                <button
                  type="submit"
                  className={`btn ${staff ? 'btn-red' : ''}`}
                  style={{ width: '100%', marginTop: '0.75rem' }}
                  disabled={busy}
                >
                  {busy ? 'Resetting Password...' : 'Reset Password'}
                </button>

                <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn-link"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      color: 'var(--muted)',
                    }}
                    onClick={() => {
                      setStep('request');
                      setError('');
                      setFieldErr({});
                    }}
                  >
                    ← Change Email or Phone Number
                  </button>
                </div>
              </form>
            )}

            <p className="center small" style={{ marginTop: '1.25rem' }}>
              Remember your password?{' '}
              <Link to={staff ? '/admin/login' : '/login'}>
                {staff ? 'Staff login' : 'Student login'}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export const StudentForgotPassword = () => <ForgotPasswordCard portal="student" />;
export const StaffForgotPassword = () => <ForgotPasswordCard portal="staff" />;
export default ForgotPasswordCard;
