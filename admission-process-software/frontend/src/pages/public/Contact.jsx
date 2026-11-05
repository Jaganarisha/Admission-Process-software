import { useState } from 'react';
import { Field } from '../../components/ui';
import { COLLEGE } from '../../config/college';

export default function Contact() {
  const [f, setF] = useState({ name: '', email: '', message: '' });
  const set = (e) => setF({ ...f, [e.target.name]: e.target.value });
  // no public mail endpoint: the form prepares an email to the college in the visitor's mail app
  const submit = (e) => {
    e.preventDefault();
    const body = `${f.message}\n\nFrom: ${f.name} (${f.email})`;
    window.location.href = `mailto:${COLLEGE.email}?subject=${encodeURIComponent('Admission enquiry')}&body=${encodeURIComponent(body)}`;
  };
  return (
    <div className="container section">
      <div className="section-title"><h2>Contact Us</h2></div>
      <div className="grid g2">
        <div className="card">
          <h3>{COLLEGE.name}</h3>
          <dl className="kv">
            <dt>Address</dt><dd>{COLLEGE.address}</dd>
            <dt>Phone</dt><dd>{COLLEGE.phones.join(' / ')}</dd>
            <dt>Email</dt><dd><a href={`mailto:${COLLEGE.email}`}>{COLLEGE.email}</a></dd>
            <dt>Website</dt><dd><a href={COLLEGE.website} target="_blank" rel="noreferrer">{COLLEGE.website}</a></dd>
          </dl>
        </div>
        <form className="card" onSubmit={submit}>
          <h3>Send an enquiry</h3>
          <Field label="Your name" name="name" value={f.name} onChange={set} required />
          <Field label="Email" name="email" type="email" value={f.email} onChange={set} required />
          <Field label="Message" name="message" type="textarea" value={f.message} onChange={set} required />
          <button className="btn" type="submit">Send by email</button>
        </form>
      </div>
    </div>
  );
}
