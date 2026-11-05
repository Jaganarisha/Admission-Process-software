import { useState } from 'react';
import { STATUS_META, FLOW, inr } from '../utils/format';

export const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, tone: 'gray' };
  return <span className={`badge tone-${m.tone}`}>{m.label}</span>;
};

export const Spinner = () => <div className="spinner" role="status" aria-label="Loading" />;

/** Photo banner. `image` is a path under /public/images. */
export const Banner = ({ image, title, subtitle, tall, children }) => (
  <header className={`banner${tall ? ' tall' : ''}`} style={{ backgroundImage: `url(${image})` }}>
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
      {children}
    </div>
  </header>
);

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

/** Label + input/select/textarea with inline error. Supports password review option and labelRight action. */
export function Field({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
  required,
  options,
  disabled,
  hint,
  labelRight,
  canTogglePassword = true,
  ...rest
}) {
  const id = `f-${name}`;
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword && showPassword ? 'text' : type;

  const common = { id, name, value: value ?? '', onChange, disabled, required, 'aria-invalid': !!error, ...rest };

  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <div className="field-header">
        <label htmlFor={id}>{label}{required && <span className="req"> *</span>}</label>
        {labelRight && <div className="field-action">{labelRight}</div>}
      </div>
      {type === 'select' ? (
        <select {...common}>
          <option value="">Select...</option>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea rows={3} {...common} />
      ) : isPassword && canTogglePassword ? (
        <div className="pw-wrap">
          <input type={effectiveType} {...common} />
          <button
            type="button"
            className="pw-toggle-btn"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Review password'}
            title={showPassword ? 'Hide password' : 'Review password'}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      ) : (
        <input type={type} {...common} />
      )}
      {hint && !error && <span className="muted small">{hint}</span>}
      {error && <span className="err" role="alert">{error}</span>}
    </div>
  );
}


export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between mb"><h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn btn-outline btn-sm" onClick={onClose} aria-label="Close">✕</button></div>
        {children}
      </div>
    </div>
  );
}

/** Confirmation dialog; with `askReason` the action needs a typed reason (used for rejections). */
export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', tone = 'navy', askReason, busy, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  const blocked = askReason && !reason.trim();
  return (
    <Modal title={title} onClose={onCancel}>
      <p>{message}</p>
      {askReason && <Field label="Reason / remarks" name="reason" type="textarea" value={reason} onChange={(e) => setReason(e.target.value)} required />}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
        <button className={`btn ${tone === 'red' ? 'btn-red' : tone === 'green' ? 'btn-green' : ''}`} disabled={blocked || busy} onClick={() => onConfirm(reason.trim())}>
          {busy ? 'Please wait...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Admission progress tracker (Draft -> ... -> Confirmed). */
export function Tracker({ status }) {
  const rejected = status === 'REJECTED';
  const idx = FLOW.indexOf(status);
  return (
    <div className="tracker" aria-label="Admission progress">
      {FLOW.map((s, i) => {
        const cls = rejected && i === 3 ? 'bad' : !rejected && i < idx ? 'done' : !rejected && i === idx ? 'current' : '';
        return <div key={s} className={`t ${cls}`} data-n={cls === 'done' ? '✓' : i + 1}>{STATUS_META[s].label}</div>;
      })}
    </div>
  );
}

/** Fee breakdown table used on the Courses page, form review and payment page. */
export function FeeBreakdown({ fee, duration }) {
  if (!fee) return <p className="muted">Fee details will appear once a course is selected.</p>;
  const rows = [
    [`Tuition fee per year`, fee.tuition_fee_per_year],
    [`Total tuition (${duration} years)`, fee.total_tuition],
    ['Admission fee (one-time)', fee.admission_fee],
    ['Caution deposit (one-time, refundable)', fee.caution_deposit],
    ['Establishment charges (one-time)', fee.establishment_fee],
    ['Electricity charges (per year)', fee.electricity_fee_per_year],
  ];
  return (
    <div className="table-wrap">
      {fee.concession_applied && (
        <div className="alert alert-ok" style={{ marginBottom: '.75rem', padding: '.55rem .85rem' }}>
          🏷️ <b>50% Government Quota Concession Applied:</b> All fees are reduced to half of the original fees under Government quota (TNEA / counselling).
        </div>
      )}
      <table>
        <tbody>
          {rows.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num">{inr(v)}</td></tr>)}
        </tbody>
        <tfoot>
          <tr>
            <td>
              Payable at admission (1st year)
              {fee.concession_applied && (
                <span className="small muted" style={{ display: 'block', fontWeight: 'normal', color: 'var(--c-green-dark, #0d7d4d)' }}>
                  ✓ 50% concession applied
                </span>
              )}
            </td>
            <td className="num">
              {fee.original_fee && (
                <span className="muted" style={{ textDecoration: 'line-through', marginRight: '.5rem', fontWeight: 'normal', fontSize: '.9em' }}>
                  {inr(fee.original_fee.first_year_payable)}
                </span>
              )}
              <b>{inr(fee.first_year_payable)}</b>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

