// Pure module: fee calculations (unit-tested in tests/). All amounts in INR.
const n = (v) => Number(v) || 0;

function isGovernmentQuota(category) {
  if (!category) return false;
  const s = String(category).trim().toUpperCase();
  return s === 'GOVERNMENT' || s.startsWith('GOVERNMENT') || s.includes('TNEA') || s.includes('COUNSELLING');
}

function firstYearBreakdown(fee) {
  return {
    tuition: n(fee.tuition_fee_per_year),
    admission: n(fee.admission_fee),
    caution_deposit: n(fee.caution_deposit),
    establishment: n(fee.establishment_fee),
    electricity: n(fee.electricity_fee_per_year),
  };
}

const firstYearTotal = (fee) => Object.values(firstYearBreakdown(fee)).reduce((a, b) => a + b, 0);

/** Decorate a fee row with derived totals for the API / UI, applying 50% concession for Government quota if applicable. */
function withTotals(fee, durationYears, admissionCategory) {
  const isGov = isGovernmentQuota(admissionCategory);
  const baseFee = fee && fee.concession_applied && fee.original_fee ? fee.original_fee : fee;
  const factor = isGov ? 0.5 : 1;

  const tuition_fee_per_year = Math.round(n(baseFee.tuition_fee_per_year) * factor);
  const admission_fee = Math.round(n(baseFee.admission_fee) * factor);
  const caution_deposit = Math.round(n(baseFee.caution_deposit) * factor);
  const establishment_fee = Math.round(n(baseFee.establishment_fee) * factor);
  const electricity_fee_per_year = Math.round(n(baseFee.electricity_fee_per_year) * factor);

  const adjustedFee = {
    ...baseFee,
    tuition_fee_per_year,
    admission_fee,
    caution_deposit,
    establishment_fee,
    electricity_fee_per_year,
  };

  const total_tuition = tuition_fee_per_year * (Number(durationYears) || 0);
  const first_year_payable = firstYearTotal(adjustedFee);

  return {
    ...adjustedFee,
    total_tuition,
    first_year_payable,
    concession_applied: isGov,
    concession_rate: isGov ? 0.5 : 0,
    concession_label: isGov ? 'Government quota (TNEA / counselling) - 50% fee concession' : null,
    ...(isGov ? {
      original_fee: {
        tuition_fee_per_year: n(baseFee.tuition_fee_per_year),
        admission_fee: n(baseFee.admission_fee),
        caution_deposit: n(baseFee.caution_deposit),
        establishment_fee: n(baseFee.establishment_fee),
        electricity_fee_per_year: n(baseFee.electricity_fee_per_year),
        total_tuition: n(baseFee.tuition_fee_per_year) * (Number(durationYears) || 0),
        first_year_payable: firstYearTotal(baseFee),
      },
    } : {}),
  };
}

module.exports = { isGovernmentQuota, firstYearBreakdown, firstYearTotal, withTotals };

