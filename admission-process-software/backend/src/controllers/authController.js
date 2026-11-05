const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { tx } = require('../config/db');
const users = require('../models/userModel');
const { COOKIE, cookieOptions, signToken } = require('../middleware/auth');
const { asyncHandler, HttpError } = require('../middleware/error');
const { sendMail } = require('../services/email');
const { sendSms } = require('../services/sms');
const { notifyUser } = require('../services/notify');
const env = require('../config/env');

// compared against when the email is unknown so response time does not reveal which emails exist
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function maskEmail(email) {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function maskPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '').slice(-10);
  if (digits.length < 4) return digits;
  return `+91 ******${digits.slice(-4)}`;
}

const register = asyncHandler(async (req, res) => {
  const { name, email, mobile, password } = req.body;
  if (await users.findByEmail(email)) throw new HttpError(409, 'An account with this email already exists');
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await tx((client) => users.createStudent(client, { name, email, mobile, passwordHash }));
  res.cookie(COOKIE, signToken(user), cookieOptions());
  res.status(201).json({ user });
});

const login = asyncHandler(async (req, res) => {
  const { email, password, portal } = req.body;
  const user = await users.findByEmail(email);
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  const portalOk = user && (portal === 'student' ? user.role === 'student' : user.role !== 'student');
  if (!user || !ok || !portalOk || !user.is_active) throw new HttpError(401, 'Invalid email or password');
  const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.cookie(COOKIE, signToken(safe), cookieOptions());
  res.json({ user: safe });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email, mobile, identifier, portal } = req.body;
  const target = (identifier || email || mobile || '').trim();

  let user = null;
  if (mobile && !email) {
    user = await users.findByMobile(mobile, portal);
  } else if (email && !mobile) {
    user = await users.findUserByIdentifier(email, portal);
  } else {
    user = await users.findUserByIdentifier(target, portal);
  }

  const portalOk = user && (portal === 'student' ? user.role === 'student' : user.role !== 'student');

  if (!user || !portalOk || !user.is_active) {
    const isMobileTarget = Boolean(mobile || (!target.includes('@') && target.replace(/\D/g, '').length === 10));
    throw new HttpError(
      404,
      `No registered ${portal === 'student' ? 'student' : 'staff / admin'} account found with this ${isMobileTarget ? 'phone number' : 'email address'}.`
    );
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  await users.savePasswordReset({
    userId: user.id,
    email: user.email,
    mobile: user.mobile || null,
    code,
    token,
    expiresAt,
  });

  console.log(`[password-reset] Reset OTP for ${user.email} (Mobile: ${user.mobile || 'None'}, Role: ${user.role}): ${code}`);

  // Send via email if email is present
  if (user.email) {
    await sendMail({
      to: user.email,
      subject: 'BEC Admissions - Password Reset OTP Code',
      text: `Hello ${user.name},\n\nYour 6-digit verification code (OTP) to reset your password is:\n\n${code}\n\nThis code will expire in 15 minutes.\n\nIf you did not request a password reset, please ignore this email.\n\nBharathidasan Engineering College, Nattrampalli`,
    });
  }

  // Send via SMS if user has a registered mobile number
  if (user.mobile) {
    await sendSms({
      to: user.mobile,
      otp: code,
      message: `Your BEC Admissions OTP to reset password is ${code}. Valid for 15 minutes.`,
    });
  }

  const requestedByMobile = Boolean(mobile || (!target.includes('@') && target.replace(/\D/g, '').length === 10));
  let message = '';
  if (requestedByMobile && user.mobile) {
    message = `A 6-digit OTP has been sent to your registered phone number ${maskPhone(user.mobile)}${user.email ? ` (and email ${maskEmail(user.email)})` : ''}.`;
  } else {
    message = `A 6-digit OTP has been sent to your registered email ${user.email}${user.mobile ? ` (and phone ${maskPhone(user.mobile)})` : ''}.`;
  }

  res.json({
    message,
    devCode: !env.isProd || !env.smtp.host ? code : undefined,
    deliveryMethod: requestedByMobile ? 'mobile' : 'email',
    email: user.email,
    mobile: user.mobile,
    maskedEmail: maskEmail(user.email),
    maskedPhone: maskPhone(user.mobile),
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, mobile, identifier, portal, code, newPassword } = req.body;
  const target = (identifier || email || mobile || '').trim();

  let user = null;

  if (code) {
    const reset = await users.findPasswordReset(target, code.trim());
    if (!reset) {
      throw new HttpError(400, 'Invalid or expired verification OTP. Please check the code or request a new OTP.');
    }
    user = await users.findById(reset.user_id);
  } else if (portal === 'student' && mobile && email) {
    user = await users.findStudentByEmailAndMobile(email, mobile);
    if (!user || !user.is_active) {
      throw new HttpError(400, 'Student details do not match our records. Please verify your email and registered mobile number.');
    }
  } else {
    throw new HttpError(400, 'Verification code (OTP) is required.');
  }

  const portalOk = user && (portal === 'student' ? user.role === 'student' : user.role !== 'student');
  if (!user || !portalOk || !user.is_active) {
    throw new HttpError(400, 'Account not eligible for password reset.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await users.updatePassword(user.id, passwordHash);

  await notifyUser(
    user.id,
    'Password Changed Successfully',
    'Your account password has been updated. If you did not make this change, please contact the college administration immediately.'
  );

  const studentOrStaff = await users.findUserByIdentifier(user.email, portal);
  if (studentOrStaff && studentOrStaff.mobile) {
    await sendSms({
      to: studentOrStaff.mobile,
      message: 'Your BEC Admissions password has been reset successfully. If this wasn\'t you, contact the college immediately.',
    });
  }

  res.json({ message: 'Password has been successfully reset! You can now log in.' });
});

const logout = (req, res) => {
  res.clearCookie(COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.json({ message: 'Logged out' });
};

const me = asyncHandler(async (req, res) => {
  const user = await users.findById(req.user.id);
  if (!user || !user.is_active) throw new HttpError(401, 'Account unavailable');
  res.json({ user });
});

module.exports = { register, login, forgotPassword, resetPassword, logout, me };

