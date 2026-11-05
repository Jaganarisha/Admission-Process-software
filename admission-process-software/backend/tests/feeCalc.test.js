const test = require('node:test');
const assert = require('node:assert/strict');
const { firstYearBreakdown, firstYearTotal, withTotals } = require('../src/services/feeCalc');

const ug = { tuition_fee_per_year: '55000.00', admission_fee: '500', caution_deposit: '5000', establishment_fee: '2000', electricity_fee_per_year: '2000' };

test('first-year total adds tuition and one-time charges', () => {
  assert.equal(firstYearTotal(ug), 64500);
  assert.deepEqual(firstYearBreakdown(ug), { tuition: 55000, admission: 500, caution_deposit: 5000, establishment: 2000, electricity: 2000 });
});

test('total tuition multiplies by course duration', () => {
  assert.equal(withTotals(ug, 4).total_tuition, 220000);
  assert.equal(withTotals({ ...ug, tuition_fee_per_year: 60000 }, 2).total_tuition, 120000);
});

test('missing or invalid amounts count as zero', () => {
  assert.equal(firstYearTotal({}), 0);
  assert.equal(firstYearTotal({ tuition_fee_per_year: 'abc', admission_fee: 500 }), 500);
});

test('government quota (TNEA / counselling) reduces fees in half', () => {
  const gov = withTotals(ug, 4, 'GOVERNMENT');
  assert.equal(gov.first_year_payable, 32250); // half of 64500
  assert.equal(gov.total_tuition, 110000);     // half of 220000
  assert.equal(gov.tuition_fee_per_year, 27500);
  assert.equal(gov.admission_fee, 250);
  assert.equal(gov.caution_deposit, 2500);
  assert.equal(gov.establishment_fee, 1000);
  assert.equal(gov.electricity_fee_per_year, 1000);
  assert.equal(gov.concession_applied, true);
  assert.equal(gov.concession_rate, 0.5);
  assert.equal(gov.original_fee.first_year_payable, 64500);
  assert.equal(gov.original_fee.total_tuition, 220000);

  // Label variant also matches
  const labelMatch = withTotals(ug, 4, 'Government quota (TNEA / counselling)');
  assert.equal(labelMatch.first_year_payable, 32250);
  assert.equal(labelMatch.concession_applied, true);

  // Management quota keeps full fees
  const mgmt = withTotals(ug, 4, 'MANAGEMENT');
  assert.equal(mgmt.first_year_payable, 64500);
  assert.equal(mgmt.total_tuition, 220000);
  assert.equal(mgmt.concession_applied, false);
});

