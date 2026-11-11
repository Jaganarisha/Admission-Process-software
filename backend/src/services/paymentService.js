const crypto = require('crypto');

/**
 * Payment gateway adapter. This demo implementation always succeeds so the full workflow can be tested.
 * To go live, replace charge() with a real gateway (e.g. Razorpay Orders API + webhook signature verification)
 * and keep the same return shape: { status: 'SUCCESS' | 'FAILED', reference }.
 */
async function charge({ amount, method }) { // eslint-disable-line no-unused-vars
  return { status: 'SUCCESS', reference: `TXN${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}` };
}

module.exports = { charge };
