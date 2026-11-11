const { z } = require('zod');

// strip angle brackets from free text (defence in depth against stored XSS; React also escapes on output)
const clean = (s) => s.replace(/[<>]/g, '').trim();
const text = (min, max, label = 'This field') =>
  z.string({ required_error: `${label} is required` }).transform(clean).pipe(z.string().min(min, `${label} is required`).max(max, `${label} is too long`));
const blankToUndef = (v) => (v === '' || v === null ? undefined : v);
const opt = (schema) => z.preprocess(blankToUndef, schema.optional());

const mobile = z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number');
const password = z.string().min(8, 'At least 8 characters').max(72)
  .regex(/[a-z]/, 'Include a lowercase letter').regex(/[A-Z]/, 'Include an uppercase letter').regex(/\d/, 'Include a number');
const email = z.string().trim().toLowerCase().email('Enter a valid email').max(160);
const pct = z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0).max(100);
const year = z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1);

const register = z.object({ name: text(2, 120, 'Name'), email, mobile, password });
const login = z.object({ email, password: z.string().min(1).max(72), portal: z.enum(['student', 'staff']) });
const forgotPassword = z.object({
  email: opt(email),
  mobile: opt(mobile),
  identifier: opt(z.string().trim().max(160)),
  portal: z.enum(['student', 'staff']),
}).refine((data) => Boolean(data.email || data.mobile || data.identifier), {
  message: 'Please provide either your registered email address or phone number',
  path: ['identifier'],
});

const resetPassword = z.object({
  email: opt(email),
  mobile: opt(mobile),
  identifier: opt(z.string().trim().max(160)),
  portal: z.enum(['student', 'staff']),
  code: opt(z.string().min(1).max(10)),
  newPassword: password,
}).refine((data) => Boolean(data.email || data.mobile || data.identifier), {
  message: 'Please provide your registered email address or phone number',
  path: ['identifier'],
});


const personal = {
  full_name: text(2, 120, 'Student name'),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date').refine((d) => new Date(d) < new Date(), 'Date must be in the past'),
  gender: z.enum(['Male', 'Female', 'Other']),
  mobile,
  email,
  address: text(5, 300, 'Address'),
  city: text(2, 80, 'City'),
  state: text(2, 80, 'State'),
  pin_code: z.string().regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
  guardian_name: text(2, 120, 'Guardian name'),
  guardian_relation: text(2, 40, 'Relationship'),
  guardian_mobile: mobile,
  guardian_occupation: text(2, 100, 'Occupation'),
  tenth_school: text(2, 150, '10th school'),
  tenth_percentage: pct,
  twelfth_school: text(2, 150, '12th school'),
  twelfth_percentage: pct,
  passing_year: year,
  previous_qualification: text(2, 150, 'Previous qualification'),
  course_id: z.coerce.number().int().positive('Select a course'),
  admission_category: z.enum(['GOVERNMENT', 'MANAGEMENT', 'LATERAL']),
};

// Draft = every field optional (autosave between steps). Full = every field required (checked on submit).
const draftShape = Object.fromEntries(Object.entries(personal).map(([k, v]) => [k, opt(v)]));
const applicationDraft = z.object(draftShape).strict();
const applicationFull = z.object(personal);

const statusUpdate = z.object({
  status: z.enum(['UNDER_VERIFICATION', 'DOCUMENTS_VERIFIED', 'APPROVED', 'REJECTED']),
  remarks: opt(text(1, 500)),
});
const docVerify = z.object({ status: z.enum(['VERIFIED', 'REJECTED']), remarks: opt(text(1, 300)) });
const payment = z.object({ method: z.enum(['UPI', 'CARD', 'NETBANKING']) });

const money = z.coerce.number().min(0).max(1000000);
const course = z.object({
  department_id: z.coerce.number().int().positive(),
  code: text(2, 20, 'Code'),
  name: text(3, 150, 'Name'),
  degree: z.enum(['B.E.', 'B.Tech', 'M.E.']),
  level: z.enum(['UG', 'PG']),
  duration_years: z.coerce.number().int().min(1).max(6),
  eligibility: opt(text(1, 300)),
  active: z.coerce.boolean().optional(),
  tuition_fee_per_year: money,
  admission_fee: money,
  caution_deposit: money,
  establishment_fee: money,
  electricity_fee_per_year: money,
});
const staffUser = z.object({ name: text(2, 120, 'Name'), email, password, role: z.enum(['admin', 'officer']), designation: opt(text(1, 100)) });
const userPatch = z.object({ is_active: z.boolean() });

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  applicationDraft,
  applicationFull,
  statusUpdate,
  docVerify,
  payment,
  course,
  staffUser,
  userPatch,
  personal,
};

