export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export const fmtDate = (d, withTime = false) => {
  if (!d) return '-';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '-';
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) });
};

export const STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'gray' },
  SUBMITTED: { label: 'Submitted', tone: 'blue' },
  UNDER_VERIFICATION: { label: 'Under Verification', tone: 'amber' },
  DOCUMENTS_VERIFIED: { label: 'Documents Verified', tone: 'teal' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  FEE_PENDING: { label: 'Fee Pending', tone: 'orange' },
  ADMISSION_CONFIRMED: { label: 'Admission Confirmed', tone: 'green' },
};

// order shown on the student's progress tracker
export const FLOW = ['DRAFT', 'SUBMITTED', 'UNDER_VERIFICATION', 'DOCUMENTS_VERIFIED', 'APPROVED', 'FEE_PENDING', 'ADMISSION_CONFIRMED'];

export const DOC_TYPES = [
  { type: 'PHOTO', label: 'Passport-size photograph', required: true, hint: 'JPG or PNG' },
  { type: 'ID_PROOF', label: 'Aadhaar / identity proof', required: true },
  { type: 'MARKSHEET_10', label: '10th mark sheet', required: true },
  { type: 'MARKSHEET_12', label: '12th mark sheet', required: true },
  { type: 'TRANSFER_CERT', label: 'Transfer Certificate', required: true },
  { type: 'COMMUNITY_CERT', label: 'Community certificate', required: false },
  { type: 'INCOME_CERT', label: 'Income certificate', required: false },
  { type: 'OTHER', label: 'Other certificates', required: false },
];
export const docLabel = (t) => DOC_TYPES.find((d) => d.type === t)?.label || t;

export const CATEGORIES = [
  { value: 'GOVERNMENT', label: 'Government quota (TNEA / counselling)' },
  { value: 'MANAGEMENT', label: 'Management quota' },
  { value: 'LATERAL', label: 'Lateral entry (Diploma holders)' },
];
export const categoryLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || '-';

export const FEE_LABELS = {
  tuition: 'Tuition fee (1st year)', admission: 'Admission fee', caution_deposit: 'Caution deposit (refundable)',
  establishment: 'Establishment charges', electricity: 'Electricity charges (1st year)',
};
