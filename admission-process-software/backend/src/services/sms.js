const env = require('../config/env');

/**
 * Service to handle SMS notifications.
 * In development, OTP is logged to console and returned via devCode.
 * External SMS gateway integration (e.g. Fast2SMS / Twilio) can be plugged in seamlessly.
 */
async function sendSms({ to, message, otp }) {
  const cleanTo = (to || '').replace(/\D/g, '').slice(-10);
  if (!cleanTo) return;

  console.log(`[sms:dev] to=+91${cleanTo} OTP=${otp || 'N/A'} message="${message}"`);

  // Optional gateway trigger if FAST2SMS_API_KEY is configured
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const https = require('https');
      const payload = JSON.stringify({
        route: 'otp',
        variables_values: otp || '',
        numbers: cleanTo,
      });

      const options = {
        hostname: 'www.fast2sms.com',
        path: '/dev/bulkV2',
        method: 'POST',
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      };

      const req = https.request(options, (res) => {
        res.on('data', () => {});
      });

      req.on('error', (err) => {
        console.error('[sms:error]', err.message);
      });

      req.write(payload);
      req.end();
    } catch (err) {
      console.error('[sms:gateway] Failed to dispatch SMS:', err.message);
    }
  }
}

module.exports = { sendSms };
