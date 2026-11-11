import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Field } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../services/api';

function LoginCard({ portal }) {
  const staff = portal === 'staff';
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [f, setF] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) navigate(user.role === 'student' ? '/student/dashboard' : '/admin/dashboard', { replace: true }); }, [user, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const u = await login(f.email, f.password, portal);
      toast.success(`Welcome, ${u.name}`);
      const back = location.state?.from;
      navigate(back || (u.role === 'student' ? '/student/dashboard' : '/admin/dashboard'), { replace: true });
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <form className={`auth-card${staff ? ' staff' : ''}`} onSubmit={submit}>
        <img className="auth-logo" src="/images/bec-logo.png" alt="Bharathidasan Engineering College logo" />
        <h1>{staff ? 'Admin / Officer Login' : 'Student Login'}</h1>
        <p className="sub">Bharathidasan Engineering College, Nattrampalli</p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <Field label="Email" name="email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="username" />
        <Field
          label="Password"
          name="password"
          type="password"
          value={f.password}
          onChange={(e) => setF({ ...f, password: e.target.value })}
          required
          autoComplete="current-password"
          labelRight={<Link to={staff ? '/admin/forgot-password' : '/forgot-password'} className="forgot-link">Forgot password?</Link>}
        />
        <button className={`btn ${staff ? 'btn-red' : ''}`} style={{ width: '100%' }} disabled={busy}>{busy ? 'Signing in...' : 'Login'}</button>
        <p className="center small">
          {staff ? (
            <>Are you a student? <Link to="/login">Student login</Link> · <Link to="/admin/forgot-password">Forgot password?</Link></>
          ) : (
            <>New student? <Link to="/register">Register here</Link> · <Link to="/admin/login">Staff login</Link> · <Link to="/forgot-password">Forgot password?</Link></>
          )}
        </p>

      </form>
    </div>
  );
}

export const StudentLogin = () => <LoginCard portal="student" />;
export const AdminLogin = () => <LoginCard portal="staff" />;
