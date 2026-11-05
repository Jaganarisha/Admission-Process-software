-- Seed data: Bharathidasan Engineering College departments, courses and fee structure.
-- Users (admin / officer / demo student) are created by backend/scripts/seed-users.js so passwords are bcrypt-hashed.
--
-- NOTE ON FEES: figures are INDICATIVE, compiled from public listings (tuition ~Rs 55,000/yr UG, ~Rs 60,000/yr PG;
-- one-time/other charges from the college's published charge list). Confirm against the college's current official
-- fee notice (TNEA / management quota) and edit via Admin > Courses & Fees before real use.

INSERT INTO departments (code, name) VALUES
 ('CSE',  'Computer Science and Engineering'),
 ('IT',   'Information Technology'),
 ('AIDS', 'Artificial Intelligence and Data Science'),
 ('ECE',  'Electronics and Communication Engineering'),
 ('EEE',  'Electrical and Electronics Engineering'),
 ('MECH', 'Mechanical Engineering'),
 ('CIVIL','Civil Engineering');

INSERT INTO courses (department_id, code, name, degree, level, duration_years, eligibility)
SELECT d.id, v.code, v.name, v.degree, v.level, v.years, v.elig
FROM (VALUES
 ('CSE',  'BE-CSE',   'B.E. Computer Science and Engineering',               'B.E.',   'UG', 4, 'Pass in 10+2 with Physics, Chemistry and Mathematics'),
 ('ECE',  'BE-ECE',   'B.E. Electronics and Communication Engineering',      'B.E.',   'UG', 4, 'Pass in 10+2 with Physics, Chemistry and Mathematics'),
 ('EEE',  'BE-EEE',   'B.E. Electrical and Electronics Engineering',         'B.E.',   'UG', 4, 'Pass in 10+2 with Physics, Chemistry and Mathematics'),
 ('MECH', 'BE-MECH',  'B.E. Mechanical Engineering',                         'B.E.',   'UG', 4, 'Pass in 10+2 with Physics, Chemistry and Mathematics'),
 ('CIVIL','BE-CIVIL', 'B.E. Civil Engineering',                              'B.E.',   'UG', 4, 'Pass in 10+2 with Physics, Chemistry and Mathematics'),
 ('IT',   'BTECH-IT', 'B.Tech Information Technology',                       'B.Tech', 'UG', 4, 'Pass in 10+2 with Physics, Chemistry and Mathematics'),
 ('AIDS', 'BTECH-AIDS','B.Tech Artificial Intelligence and Data Science',    'B.Tech', 'UG', 4, 'Pass in 10+2 with Physics, Chemistry and Mathematics'),
 ('CSE',  'ME-CSE',   'M.E. Computer Science and Engineering',               'M.E.',   'PG', 2, 'B.E./B.Tech in a relevant discipline; TANCET/GATE as applicable'),
 ('CIVIL','ME-STRUCT','M.E. Structural Engineering',                         'M.E.',   'PG', 2, 'B.E./B.Tech in Civil Engineering; TANCET/GATE as applicable'),
 ('ECE',  'ME-APPELEC','M.E. Applied Electronics',                           'M.E.',   'PG', 2, 'B.E./B.Tech in ECE/EEE or related; TANCET/GATE as applicable'),
 ('MECH', 'ME-THERMAL','M.E. Thermal Engineering',                           'M.E.',   'PG', 2, 'B.E./B.Tech in Mechanical or related; TANCET/GATE as applicable')
) AS v(dept, code, name, degree, level, years, elig)
JOIN departments d ON d.code = v.dept;

-- UG: tuition 55,000/yr (about 2.2 lakh over 4 years); PG: 60,000/yr (about 1.2 lakh over 2 years)
INSERT INTO fee_structures (course_id, academic_year, tuition_fee_per_year, admission_fee, caution_deposit, establishment_fee, electricity_fee_per_year)
SELECT c.id, '2026-27',
       CASE WHEN c.level = 'UG' THEN 55000 ELSE 60000 END,
       500, 5000, 2000, 2000
FROM courses c;
