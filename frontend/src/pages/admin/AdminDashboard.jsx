import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api, { errorMessage } from '../../services/api';
import { Spinner } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { STATUS_META } from '../../utils/format';

const COLORS = ['#17307a', '#d7263d', '#4f9d2d', '#f4c20d', '#17a2b8', '#f08a24', '#7b5ea7', '#8892a6'];
const CARDS = [
  ['total', 'Total applications', ''], ['pending', 'Pending applications', 'gold'], ['verified', 'Verified applications', 'teal'], ['approved', 'Approved applications', 'green'],
  ['rejected', 'Rejected applications', 'red'], ['fee_pending', 'Fee pending', 'orange'], ['confirmed', 'Confirmed admissions', 'green'],
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { api.get('/admin/stats').then((r) => setData(r.data)).catch((e) => setError(errorMessage(e))); }, []);

  return (
    <>
      <div className="portal-header mb">
        <h2>Welcome, {user.name}</h2>
        <p className="muted">Bharathidasan Engineering College · Admission dashboard</p>
      </div>
      <form className="row mb no-print" onSubmit={(e) => { e.preventDefault(); navigate(`/admin/applications?search=${encodeURIComponent(q)}`); }}>
        <input className="field" style={{ flex: 1, minWidth: 220, padding: '.6rem .75rem', border: '1px solid #c5cde0', borderRadius: 8 }} placeholder="Search by application number or student name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search applications" />
        <button className="btn">Search</button><Link className="btn btn-outline" to="/admin/applications">Advanced filters</Link>
      </form>
      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <div className="grid g4">
            {CARDS.map(([k, label, tone]) => <div key={k} className={`card stat ${tone}`}><div className="muted small">{label}</div><div className="n">{data.totals[k]}</div></div>)}
          </div>
          <div className="grid g2 mt">
            <div className="card"><h3>Applications by course</h3>
              <div className="barchart-wrap"><ResponsiveContainer><BarChart data={data.byCourse} margin={{ left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="code" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} /><YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="count" name="Applications" fill="#17307a" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
            <div className="card"><h3>Applications by status</h3>
              <div className="barchart-wrap"><ResponsiveContainer><PieChart>
                <Pie data={data.byStatus.map((s) => ({ name: STATUS_META[s.status].label, value: s.count }))} dataKey="value" nameKey="name" outerRadius={90} label>
                  {data.byStatus.map((s, i) => <Cell key={s.status} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div></div>
            <div className="card"><h3>Applications submitted (last 6 months)</h3>
              <div className="barchart-wrap"><ResponsiveContainer><BarChart data={data.monthly} margin={{ left: -15 }}>
                <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="cnt" name="Submitted" fill="#4f9d2d" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
          </div>
        </>
      )}
    </>
  );
}
