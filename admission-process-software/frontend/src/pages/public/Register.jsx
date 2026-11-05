import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage, fieldErrors } from '../../services/api';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', mobile: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (f.password !== f.confirm) return setErrors({ confirm: 'Passwords do not match' });
    setBusy(true); setErrors({});
    try {
      const { confirm, ...payload } = f;
      await register(payload);
      toast.success('Registration successful. Welcome!');
      navigate('/student/dashboard');
    } catch (err) {
      setErrors({ ...fieldErrors(err), form: errorMessage(err) });
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit} noValidate>
        <img className="auth-logo" src="/images/bec-logo.png" alt="Bharathidasan Engineering College logo" style={{ width: 90, height: 90 }} />
        <h1>Student Registration</h1>
        <p className="sub">Create your account to start the admission application</p>
        {errors.form && <div className="alert alert-error" role="alert">{errors.form}</div>}
        <Field label="Full name" name="name" value={f.name} onChange={set} error={errors.name} required autoComplete="name" />
        <Field label="Email" name="email" type="email" value={f.email} onChange={set} error={errors.email} required autoComplete="email" />
        <Field label="Mobile number" name="mobile" type="tel" value={f.mobile} onChange={set} error={errors.mobile} required maxLength={10} inputMode="numeric" />
        <Field label="Password" name="password" type="password" value={f.password} onChange={set} error={errors.password} required autoComplete="new-password" hint="8+ characters with upper-case, lower-case and a number" />
        <Field label="Confirm password" name="confirm" type="password" value={f.confirm} onChange={set} error={errors.confirm} required autoComplete="new-password" />
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? 'Creating account...' : 'Register'}</button>
        <p className="center small">Already registered? <Link to="/login">Student login</Link></p>
      </form>
    </div>
  );
}
