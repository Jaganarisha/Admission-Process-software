import { Link } from 'react-router-dom';
import { DOC_TYPES } from '../../utils/format';
import { COLLEGE } from '../../config/college';
import AdmissionProcessMotion from '../../components/AdmissionProcessMotion';

export default function AboutProcess() {
  return (
    <div className="container section">
      <div className="section-title">
        <h2>Admission Process</h2>
        <p className="muted" style={{ marginTop: '.35rem' }}>{COLLEGE.name} · Academic year {COLLEGE.academicYear}</p>
      </div>

      {/* Eight-Step Admission Process with Roll Transitions */}
      <AdmissionProcessMotion
        title="Admission Process Steps in Roll Transitions"
        subtitle="Follow each stage from candidate registration to admission confirmation with interactive 3D roll transitions."
        showAdminOfficeBanner={true}
      />

      <div className="grid g2 mt">
        <div className="card" id="documents">
          <h3>Documents to keep ready</h3>
          <ul>{DOC_TYPES.map((d) => <li key={d.type}>{d.label} {d.required ? <b>(required)</b> : <span className="muted">(if applicable)</span>}</li>)}</ul>
        </div>
        <div className="card">
          <h3>Good to know</h3>
          <ul>
            <li>Government-quota B.E./B.Tech seats are allotted through the TNEA counselling process (with a 50% fee concession on standard tuition and fees); management-quota seats are processed directly by the college.</li>
            <li>Undergraduate courses need a pass in 10+2 with Physics, Chemistry and Mathematics. M.E. courses need a relevant B.E./B.Tech degree.</li>
            <li>The fee payable at admission is shown for every course on the <Link to="/courses">Courses &amp; Fees</Link> page.</li>
            <li>Your application status is always visible in your dashboard.</li>
          </ul>
          <Link to="/register" className="btn">Register now</Link>
        </div>
      </div>
    </div>
  );
}
