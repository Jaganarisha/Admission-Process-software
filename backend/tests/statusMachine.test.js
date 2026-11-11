const test = require('node:test');
const assert = require('node:assert/strict');
const sm = require('../src/services/statusMachine');

test('follows the admission workflow in order', () => {
  const path = ['DRAFT', 'SUBMITTED', 'UNDER_VERIFICATION', 'DOCUMENTS_VERIFIED', 'APPROVED', 'FEE_PENDING', 'ADMISSION_CONFIRMED'];
  for (let i = 0; i < path.length - 1; i++) assert.ok(sm.canTransition(path[i], path[i + 1]), `${path[i]} -> ${path[i + 1]}`);
});

test('does not allow skipping steps or going backwards', () => {
  assert.equal(sm.canTransition('SUBMITTED', 'APPROVED'), false);
  assert.equal(sm.canTransition('DRAFT', 'ADMISSION_CONFIRMED'), false);
  assert.equal(sm.canTransition('FEE_PENDING', 'UNDER_VERIFICATION'), false);
});

test('rejected and confirmed are terminal', () => {
  assert.deepEqual(sm.TRANSITIONS.REJECTED, []);
  assert.deepEqual(sm.TRANSITIONS.ADMISSION_CONFIRMED, []);
});

test('rejection is possible only before approval', () => {
  for (const from of ['SUBMITTED', 'UNDER_VERIFICATION', 'DOCUMENTS_VERIFIED']) assert.ok(sm.canTransition(from, 'REJECTED'));
  assert.equal(sm.canTransition('FEE_PENDING', 'REJECTED'), false);
});

test('staff cannot set payment-driven or student-driven statuses', () => {
  for (const s of ['DRAFT', 'SUBMITTED', 'FEE_PENDING', 'ADMISSION_CONFIRMED']) assert.equal(sm.STAFF_SETTABLE.includes(s), false);
});

test('detects missing required documents', () => {
  const docs = [{ doc_type: 'PHOTO' }, { doc_type: 'ID_PROOF' }];
  assert.deepEqual(sm.missingRequiredDocs(docs), ['MARKSHEET_10', 'MARKSHEET_12', 'TRANSFER_CERT']);
  assert.deepEqual(sm.missingRequiredDocs(sm.REQUIRED_DOCS.map((doc_type) => ({ doc_type }))), []);
});

test('all required documents must be verified (optional ones are ignored)', () => {
  const verified = sm.REQUIRED_DOCS.map((doc_type) => ({ doc_type, status: 'VERIFIED' }));
  assert.ok(sm.allRequiredVerified(verified));
  assert.equal(sm.allRequiredVerified([...verified.slice(1), { doc_type: 'PHOTO', status: 'PENDING' }]), false);
  assert.ok(sm.allRequiredVerified([...verified, { doc_type: 'OTHER', status: 'REJECTED' }]));
});
