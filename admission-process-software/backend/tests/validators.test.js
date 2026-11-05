// Needs dependencies installed (npm install) because it imports zod through the schemas module.
const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../src/validators/schemas');

test('registration accepts a valid student and normalises the email', () => {
  const r = s.register.safeParse({ name: 'Asha K', email: ' Asha@Example.COM ', mobile: '9876543210', password: 'Strong123' });
  assert.ok(r.success);
  assert.equal(r.data.email, 'asha@example.com');
});

test('registration rejects weak passwords and bad mobiles', () => {
  assert.equal(s.register.safeParse({ name: 'Asha', email: 'a@b.co', mobile: '9876543210', password: 'weak' }).success, false);
  assert.equal(s.register.safeParse({ name: 'Asha', email: 'a@b.co', mobile: '12345', password: 'Strong123' }).success, false);
});

test('angle brackets are stripped from free text (XSS defence in depth)', () => {
  const r = s.register.safeParse({ name: '<script>alert(1)</script>Ravi', email: 'r@b.co', mobile: '9876543210', password: 'Strong123' });
  assert.ok(r.success);
  assert.ok(!/[<>]/.test(r.data.name));
});

test('draft application allows partial data but rejects unknown fields', () => {
  assert.ok(s.applicationDraft.safeParse({ city: 'Vellore', tenth_percentage: '' }).success);
  assert.equal(s.applicationDraft.safeParse({ role: 'admin' }).success, false);
});

test('percentages must be between 0 and 100', () => {
  assert.equal(s.applicationDraft.safeParse({ twelfth_percentage: 101 }).success, false);
  assert.ok(s.applicationDraft.safeParse({ twelfth_percentage: '88.5' }).success);
});

test('portal must be student or staff', () => {
  assert.equal(s.login.safeParse({ email: 'a@b.co', password: 'x', portal: 'root' }).success, false);
});
