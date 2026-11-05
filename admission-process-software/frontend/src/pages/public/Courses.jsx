import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../services/api';
import { FeeBreakdown, Spinner } from '../../components/ui';
import { inr } from '../../utils/format';
import { COLLEGE } from '../../config/college';

export default function Courses() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [level, setLevel] = useState('ALL');
  const [open, setOpen] = useState(null);
  useEffect(() => { api.get('/courses').then((r) => setData(r.data)).catch((e) => setError(errorMessage(e))); }, []);

  const list = data ? data.courses.filter((c) => level === 'ALL' || c.level === level) : [];
  return (
    <div className="container section">
      <div className="section-title">
        <h2>Courses &amp; Fee Structure</h2>
        <p className="muted" style={{ marginTop: '.35rem' }}>{COLLEGE.name} · Academic year {data?.academicYear || COLLEGE.academicYear}</p>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {!data && !error && <Spinner />}
      {data && (
        <>
          <div className="alert alert-info">
            Fees shown are standard amounts. Candidates admitted under <b>Government quota (TNEA / counselling)</b> receive a <b>50% fee concession</b> (all tuition and fees reduced in half).
          </div>
          <div className="tabs" role="tablist">
            {[['ALL', 'All courses'], ['UG', 'Undergraduate (B.E. / B.Tech)'], ['PG', 'Postgraduate (M.E.)']].map(([v, l]) => (
              <button key={v} role="tab" aria-selected={level === v} className={`btn btn-sm ${level === v ? '' : 'btn-outline'}`} onClick={() => setLevel(v)}>{l}</button>
            ))}
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Course</th><th>Department</th><th>Duration</th><th className="num">Tuition / year</th><th className="num">Total tuition</th><th className="num">Payable at admission</th><th /></tr></thead>
              <tbody>
                {list.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr className={open === c.id ? 'detail-open' : ''}>
                      <td><b>{c.name}</b></td><td>{c.department_name}</td><td>{c.duration_years} years</td>
                      <td className="num">{inr(c.tuition_fee_per_year)}</td><td className="num">{inr(c.total_tuition)}</td><td className="num"><b>{inr(c.first_year_payable)}</b></td>
                      <td><button className="btn btn-outline btn-sm" onClick={() => setOpen(open === c.id ? null : c.id)}>{open === c.id ? 'Hide' : 'Details'}</button></td>
                    </tr>
                    {open === c.id && (
                      <tr className="detail-row">
                        <td colSpan="7" style={{ padding: 0, border: 0 }}>
                          <div className="course-detail-panel">
                            <div className="course-detail-inner">
                              <h3>{c.name}</h3>
                              <p className="muted small">Eligibility: {c.eligibility}</p>
                              <FeeBreakdown fee={c} duration={c.duration_years} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <p className="center mt"><Link to="/register" className="btn btn-gold">Apply now</Link></p>
        </>
      )}
    </div>
  );
}
