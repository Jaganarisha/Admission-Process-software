import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../services/api';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useMyApplication } from '../../services/hooks';
import { fmtDate } from '../../utils/format';

export function Profile() {
  const { user } = useAuth();
  const { app, loading } = useMyApplication();
  if (loading) return <Spinner />;
  const s = app.student;
  return (
    <>
      <div className="row between"><h2>My Profile</h2>{app.status === 'DRAFT' && <Link className="btn btn-sm" to="/student/apply/personal">Edit details</Link>}</div>
      <div className="grid g2">
        <div className="card"><h3>Account</h3>
          <dl className="kv"><dt>Name</dt><dd>{user.name}</dd><dt>Login email</dt><dd>{user.email}</dd><dt>Role</dt><dd>Student</dd></dl></div>
        <div className="card"><h3>Personal details</h3>
          <dl className="kv"><dt>Student name</dt><dd>{s.full_name}</dd><dt>Date of birth</dt><dd>{s.dob || '-'}</dd><dt>Gender</dt><dd>{s.gender || '-'}</dd>
            <dt>Mobile</dt><dd>{s.mobile}</dd><dt>Address</dt><dd>{[s.address, s.city, s.state, s.pin_code].filter(Boolean).join(', ') || '-'}</dd></dl></div>
        <div className="card"><h3>Parent / guardian</h3>
          <dl className="kv"><dt>Name</dt><dd>{s.guardian_name || '-'}</dd><dt>Relationship</dt><dd>{s.guardian_relation || '-'}</dd><dt>Mobile</dt><dd>{s.guardian_mobile || '-'}</dd><dt>Occupation</dt><dd>{s.guardian_occupation || '-'}</dd></dl></div>
        <div className="card"><h3>Academic</h3>
          <dl className="kv"><dt>10th</dt><dd>{app.academic.tenth_school || '-'} {app.academic.tenth_percentage && `· ${app.academic.tenth_percentage}%`}</dd>
            <dt>12th</dt><dd>{app.academic.twelfth_school || '-'} {app.academic.twelfth_percentage && `· ${app.academic.twelfth_percentage}%`}</dd><dt>Passing year</dt><dd>{app.academic.passing_year || '-'}</dd></dl></div>
      </div>
    </>
  );
}

export function Notifications() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const load = () => api.get('/notifications').then((r) => setItems(r.data.notifications)).catch((e) => setError(errorMessage(e)));
  useEffect(() => { load(); }, []);
  const readAll = async () => { await api.patch('/notifications/read'); load(); };
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!items) return <Spinner />;
  return (
    <>
      <div className="row between"><h2>Notifications</h2>{items.some((n) => !n.is_read) && <button className="btn btn-outline btn-sm" onClick={readAll}>Mark all as read</button>}</div>
      {items.length === 0 && <div className="card muted">No notifications yet.</div>}
      {items.map((n) => (
        <div key={n.id} className="card mb" style={n.is_read ? {} : { borderLeft: '5px solid var(--gold)' }}>
          <div className="row between"><b>{n.title}</b><span className="small muted">{fmtDate(n.created_at, true)}</span></div>
          <div>{n.message}</div>
        </div>
      ))}
    </>
  );
}
