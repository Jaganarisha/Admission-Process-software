// Pure module: admission status rules (unit-tested in tests/).
const STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_VERIFICATION: 'UNDER_VERIFICATION',
  DOCUMENTS_VERIFIED: 'DOCUMENTS_VERIFIED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  FEE_PENDING: 'FEE_PENDING',
  ADMISSION_CONFIRMED: 'ADMISSION_CONFIRMED',
});

const TRANSITIONS = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_VERIFICATION', 'REJECTED'],
  UNDER_VERIFICATION: ['DOCUMENTS_VERIFIED', 'REJECTED'],
  DOCUMENTS_VERIFIED: ['APPROVED', 'REJECTED'],
  APPROVED: ['FEE_PENDING'],
  FEE_PENDING: ['ADMISSION_CONFIRMED'],
  REJECTED: [],
  ADMISSION_CONFIRMED: [],
};

// Statuses staff may set by hand. FEE_PENDING follows APPROVED automatically,
// ADMISSION_CONFIRMED is only reached through a successful payment, SUBMITTED only by the student.
const STAFF_SETTABLE = ['UNDER_VERIFICATION', 'DOCUMENTS_VERIFIED', 'APPROVED', 'REJECTED'];

const REQUIRED_DOCS = ['PHOTO', 'ID_PROOF', 'MARKSHEET_10', 'MARKSHEET_12', 'TRANSFER_CERT'];
const OPTIONAL_DOCS = ['COMMUNITY_CERT', 'INCOME_CERT', 'OTHER'];

const canTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

function missingRequiredDocs(docs) {
  const have = new Set(docs.map((d) => d.doc_type));
  return REQUIRED_DOCS.filter((t) => !have.has(t));
}

function allRequiredVerified(docs) {
  return REQUIRED_DOCS.every((t) => docs.some((d) => d.doc_type === t && d.status === 'VERIFIED'));
}

module.exports = { STATUS, TRANSITIONS, STAFF_SETTABLE, REQUIRED_DOCS, OPTIONAL_DOCS, canTransition, missingRequiredDocs, allRequiredVerified };
