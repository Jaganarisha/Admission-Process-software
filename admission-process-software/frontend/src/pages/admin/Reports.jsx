import { useEffect, useState } from 'react';
import api, { downloadCsv, errorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Field, Spinner } from '../../components/ui';
import { inr } from '../../utils/format';

export default function Reports() {
  const toast = useToast();
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const params = Object.fromEntries(Object.entries(range).filter(([, v]) => v));

  const load = () => api.get('/admin/reports/summary', { params }).then((r) => setData(r.data)).catch((e) => toast.error(errorMessage(e)));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="row between"><h2>Admission Reports</h2>
        <div className="row no-print"><button className="btn btn-outline btn-sm" onClick={() => downloadCsv('/admin/reports/applications.csv', params, 'bec-applications.csv').catch((e) => toast.error(errorMessage(e)))}>⬇ Export applications (CSV)</button>
          <button className="btn btn-sm" onClick={() => window.print()}>🖨 Print report</button></div></div>
      <form className="card mb no-print" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <div className="filters">
          <Field label="Submitted from" name="from" type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          <Field label="Submitted to" name="to" type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        </div>
        <button className="btn btn-sm">Generate</button>
      </form>
      {!data ? <Spinner /> : (
        <>
          <p className="muted">Academic year {data.academicYear}{range.from && ` · from ${range.from}`}{range.to && ` · to ${range.to}`}</p>
          <div className="table-wrap"><table>
            <thead><tr><th>Course</th><th className="num">Applications</th><th className="num">Approved</th><th className="num">Rejected</th><th className="num">Confirmed</th><th className="num">Fees collected</th></tr></thead>
            <tbody>{data.rows.map((r) => <tr key={r.code}><td>{r.name}</td><td className="num">{r.applications}</td><td className="num">{r.approved}</td><td className="num">{r.rejected}</td><td className="num">{r.confirmed}</td><td className="num">{inr(r.fees_collected)}</td></tr>)}</tbody>
            <tfoot><tr><td>Total</td><td className="num">{data.totals.applications}</td><td className="num">{data.totals.approved}</td><td className="num">{data.totals.rejected}</td><td className="num">{data.totals.confirmed}</td><td className="num">{inr(data.totals.fees_collected)}</td></tr></tfoot></table></div>
        </>
      )}
    </>
  );
}
