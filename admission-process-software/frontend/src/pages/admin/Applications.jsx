import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { downloadCsv, errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Field, Spinner, StatusBadge } from '../../components/ui';
import { STATUS_META, fmtDate } from '../../utils/format';

export default function Applications() {
  const toast = useToast();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({ search: params.get('search') || '', status: '', course_id: '', department_id: '', from: '', to: '' });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/courses').then((r) => { setCourses(r.data.courses); setDepartments(r.data.departments); }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const clean = Object.fromEntries(Object.entries(applied).filter(([, v]) => v));
      const { data: d } = await api.get('/admin/applications', { params: { ...clean, page, limit: 15 } });
      setData(d);
    } catch (e) { toast.error(errorMessage(e)); } finally { setLoading(false); }
  }, [applied, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const set = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const apply = (e) => { e.preventDefault(); setPage(1); setApplied(filters); };
  const reset = () => { const empty = { search: '', status: '', course_id: '', department_id: '', from: '', to: '' }; setFilters(empty); setApplied(empty); setPage(1); };
  const exportCsv = () => downloadCsv('/admin/reports/applications.csv', Object.fromEntries(Object.entries(applied).filter(([, v]) => v)), 'bec-applications.csv').catch((e) => toast.error(errorMessage(e)));
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <>
      <div className="row between"><h2>Admission Applications</h2><button className="btn btn-outline btn-sm" onClick={exportCsv}>⬇ Export CSV</button></div>
      <form className="card mb" onSubmit={apply}>
        <div className="filters">
          <Field label="Application no. / name" name="search" value={filters.search} onChange={set} placeholder="Search..." />
          <Field label="Status" name="status" type="select" value={filters.status} onChange={set} options={Object.entries(STATUS_META).filter(([k]) => k !== 'DRAFT').map(([value, m]) => ({ value, label: m.label }))} />
          <Field label="Course" name="course_id" type="select" value={filters.course_id} onChange={set} options={courses.map((c) => ({ value: c.id, label: c.name }))} />
          <Field label="Department" name="department_id" type="select" value={filters.department_id} onChange={set} options={departments.map((d) => ({ value: d.id, label: d.name }))} />
          <Field label="Submitted from" name="from" type="date" value={filters.from} onChange={set} />
          <Field label="Submitted to" name="to" type="date" value={filters.to} onChange={set} />
        </div>
        <div className="row"><button className="btn btn-sm">Apply filters</button><button type="button" className="btn btn-outline btn-sm" onClick={reset}>Reset</button></div>
      </form>

      {loading && !data ? <Spinner /> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Application no.</th><th>Student</th><th>Course</th><th>Department</th><th>Submitted</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data?.rows.length === 0 && <tr><td colSpan={7} className="center muted">No applications match these filters.</td></tr>}
              {data?.rows.map((a) => (
                <tr key={a.id}>
                  <td><b>{a.application_no}</b></td><td>{a.full_name}<div className="small muted">{a.mobile}</div></td>
                  <td>{a.course_name || '-'}</td><td>{a.department_name || '-'}</td><td>{fmtDate(a.submitted_at)}</td><td><StatusBadge status={a.status} /></td>
                  <td><Link className="btn btn-sm" to={`/admin/applications/${a.id}`}>Open</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <div className="pager"><span className="muted small">{data.total} application(s)</span>
        <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page} / {pages}</span>
        <button className="btn btn-outline btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </>
  );
}
