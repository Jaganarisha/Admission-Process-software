import { useEffect, useState } from 'react';
import api, { errorMessage, fieldErrors } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ConfirmDialog, Field, Modal, Spinner } from '../../components/ui';
import { fmtDate } from '../../utils/format';

export default function Users() {
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [role, setRole] = useState('');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [toggle, setToggle] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.get('/admin/users', { params: role ? { role } : {} }).then((r) => setUsers(r.data.users)).catch((e) => toast.error(errorMessage(e)));
  useEffect(() => { load(); }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try { await api.post('/admin/users', form); toast.success('User created'); setForm(null); load(); }
    catch (err) { setErrors(fieldErrors(err)); toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  const flip = async () => {
    setBusy(true);
    try { await api.patch(`/admin/users/${toggle.id}`, { is_active: !toggle.is_active }); toast.success('User updated'); setToggle(null); load(); }
    catch (err) { toast.error(errorMessage(err)); setToggle(null); } finally { setBusy(false); }
  };
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <>
      <div className="row between"><h2>Manage Users</h2><button className="btn" onClick={() => { setErrors({}); setForm({ name: '', email: '', password: '', role: 'officer', designation: '' }); }}>+ Add admin / officer</button></div>
      <div className="tabs">{[['', 'All'], ['admin', 'Admins'], ['officer', 'Officers'], ['student', 'Students']].map(([v, l]) => <button key={v} className={`btn btn-sm ${role === v ? '' : 'btn-outline'}`} onClick={() => setRole(v)}>{l}</button>)}</div>
      {!users ? <Spinner /> : (
        <div className="table-wrap"><table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Designation</th><th>Created</th><th>Status</th><th /></tr></thead>
          <tbody>{users.map((u) => (
            <tr key={u.id}><td>{u.name}</td><td>{u.email}</td><td style={{ textTransform: 'capitalize' }}>{u.role}</td><td>{u.designation || '-'}</td><td>{fmtDate(u.created_at)}</td>
              <td><span className={`badge tone-${u.is_active ? 'green' : 'gray'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
              <td><button className="btn btn-outline btn-sm" onClick={() => setToggle(u)}>{u.is_active ? 'Disable' : 'Enable'}</button></td></tr>
          ))}</tbody></table></div>
      )}
      {form && (
        <Modal title="Add admin / officer" onClose={() => setForm(null)}>
          <form onSubmit={create} noValidate>
            <Field label="Name" name="name" value={form.name} onChange={set} error={errors.name} required />
            <Field label="Email" name="email" type="email" value={form.email} onChange={set} error={errors.email} required />
            <Field label="Temporary password" name="password" type="password" value={form.password} onChange={set} error={errors.password} required hint="8+ characters with upper-case, lower-case and a number" />
            <Field label="Role" name="role" type="select" value={form.role} onChange={set} options={[{ value: 'officer', label: 'Admission Officer' }, { value: 'admin', label: 'Admin' }]} required />
            <Field label="Designation" name="designation" value={form.designation} onChange={set} error={errors.designation} />
            <div className="row" style={{ justifyContent: 'flex-end' }}><button type="button" className="btn btn-outline" onClick={() => setForm(null)}>Cancel</button><button className="btn" disabled={busy}>Create</button></div>
          </form>
        </Modal>
      )}
      {toggle && <ConfirmDialog title={toggle.is_active ? 'Disable this user?' : 'Enable this user?'} message={`${toggle.name} (${toggle.email})`} confirmLabel="Yes" busy={busy} onConfirm={flip} onCancel={() => setToggle(null)} />}
    </>
  );
}
