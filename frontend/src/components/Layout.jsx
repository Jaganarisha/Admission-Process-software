import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { COLLEGE } from '../config/college';
import { ConfirmDialog } from './ui';
import api from '../services/api';

const Brand = ({ to = '/' }) => (
  <Link to={to} className="brand" aria-label={`${COLLEGE.name} home`}>
    <img src="/images/bec-logo.png" alt="" />
    <div><b>{COLLEGE.name}</b><span>Admission Process Software</span></div>
  </Link>
);

export function PublicLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  const home = user ? (user.role === 'student' ? '/student/dashboard' : '/admin/dashboard') : null;
  return (
    <>
      <div className="topbar no-print"><div className="container"><span>{COLLEGE.tagline}</span><span>📞 {COLLEGE.phones[0]} &nbsp;|&nbsp; ✉ {COLLEGE.email}</span></div></div>
      <nav className="navbar" aria-label="Main">
        <div className="container">
          <Brand />
          <button className="nav-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Toggle menu">☰</button>
          <div className={`nav-links${open ? ' open' : ''}`}>
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/about-admission">Admission Process</NavLink>
            <NavLink to="/courses">Courses &amp; Fees</NavLink>
            <NavLink to="/contact">Contact Us</NavLink>
            {user ? <Link className="btn btn-sm" to={home}>My Dashboard</Link> : (
              <>
                <NavLink to="/login">Student Login</NavLink>
                <NavLink to="/admin/login">Admin Login</NavLink>
                <Link className="btn btn-gold btn-sm" to="/register">Apply Now</Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <main className={pathname !== '/' ? 'page-bg' : ''}><Outlet /></main>
      <footer className="footer">
        <div className="container grid g3">
          <div><h4>{COLLEGE.name}</h4><p>{COLLEGE.address}</p></div>
          <div><h4>Contact</h4><p>{COLLEGE.phones.join(' / ')}<br />{COLLEGE.email}</p></div>
          <div><h4>Quick links</h4><p><Link to="/courses">Courses &amp; Fees</Link><br /><Link to="/about-admission">How to apply</Link><br /><Link to="/register">Student registration</Link></p></div>
        </div>
        <p className="center small" style={{ marginTop: '1.5rem' }}>© {new Date().getFullYear()} {COLLEGE.name}, {COLLEGE.place}. Admission Process Software - academic project.</p>
      </footer>
    </>
  );
}

const STUDENT_NAV = [
  ['/student/dashboard', '🏠', 'Dashboard'], ['/student/apply/personal', '📝', 'Application Form'], ['/student/status', '📍', 'Application Status'],
  ['/student/payment', '💳', 'Fee Payment'], ['/student/confirmation', '🎓', 'Admission Confirmation'], ['/student/profile', '👤', 'My Profile'], ['/student/notifications', '🔔', 'Notifications'],
];
const ADMIN_NAV = [
  ['/admin/dashboard', '📊', 'Dashboard'], ['/admin/applications', '📂', 'Applications'], ['/admin/courses', '🎓', 'Courses & Fees'],
  ['/admin/reports', '📈', 'Reports'], ['/admin/users', '👥', 'Manage Users', 'admin'],
];

export function PortalLayout({ role }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [unread, setUnread] = useState(0);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => { api.get('/notifications').then((r) => setUnread(r.data.unread)).catch(() => {}); }, [pathname]);

  const items = (role === 'student' ? STUDENT_NAV : ADMIN_NAV).filter((i) => !i[3] || i[3] === user.role);
  const doLogout = async () => { await logout(); toast.success('You have been logged out'); navigate(role === 'student' ? '/login' : '/admin/login'); };

  return (
    <div className="portal">
      <aside className={`sidebar no-print${open ? ' open' : ''}`}>
        <Brand to={role === 'student' ? '/student/dashboard' : '/admin/dashboard'} />
        <nav aria-label="Portal">
          {items.map(([to, icon, label]) => <NavLink key={to} to={to}><span aria-hidden>{icon}</span>{label}{label === 'Notifications' && unread > 0 && <span className="badge tone-red">{unread}</span>}</NavLink>)}
          <NavLink to="/"><span aria-hidden>🌐</span>Public Website</NavLink>
          <button onClick={() => setConfirm(true)}><span aria-hidden>🚪</span>Logout</button>
        </nav>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <div className="portal-main page-bg">
        <div className="portal-top no-print">
          <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <span className="muted">{COLLEGE.short} Admissions {COLLEGE.academicYear}</span>
          <span><b>{user.name}</b> <span className="badge tone-blue" style={{ textTransform: 'capitalize' }}>{user.role}</span></span>
        </div>
        <Outlet />
      </div>
      {confirm && <ConfirmDialog title="Log out?" message="You will need to sign in again to continue." confirmLabel="Logout" onConfirm={doLogout} onCancel={() => setConfirm(false)} />}
    </div>
  );
}
