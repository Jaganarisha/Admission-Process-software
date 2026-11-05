// Creates demo accounts with bcrypt-hashed passwords (passwords come from .env). Usage: npm run db:seed-users
const bcrypt = require('bcryptjs');
const { pool, tx } = require('../src/config/db');
const users = require('../src/models/userModel');

const accounts = [
  { name: 'System Administrator', email: 'admin@bec.ac.in', role: 'admin', designation: 'Administrator', pw: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345' },
  { name: 'Admission Officer', email: 'officer@bec.ac.in', role: 'officer', designation: 'Admission Officer', pw: process.env.SEED_OFFICER_PASSWORD || 'Officer@12345' },
];

(async () => {
  for (const a of accounts) {
    if (await users.findByEmail(a.email)) { console.log(`exists: ${a.email}`); continue; }
    await tx(async (c) => users.createStaff(c, { ...a, passwordHash: await bcrypt.hash(a.pw, 12) }));
    console.log(`created ${a.role}: ${a.email}`);
  }
  const demo = 'student@example.com';
  if (!(await users.findByEmail(demo))) {
    await tx(async (c) => users.createStudent(c, { name: 'Demo Student', email: demo, mobile: '9876543210', passwordHash: await bcrypt.hash(process.env.SEED_STUDENT_PASSWORD || 'Student@12345', 12) }));
    console.log(`created student: ${demo}`);
  }
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
