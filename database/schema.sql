-- Admission Process Software - Bharathidasan Engineering College (BEC), Nattrampalli
-- PostgreSQL schema. Run: psql "$DATABASE_URL" -f schema.sql   (or: npm run db:init in backend/)

DROP TABLE IF EXISTS notifications, admission_status, payments, documents, academic_details,
  applications, fee_structures, courses, departments, students, admins, users CASCADE;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role          VARCHAR(10)  NOT NULL CHECK (role IN ('admin','officer','student')),
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- staff profile (admin / admission officer)
CREATE TABLE admins (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  designation VARCHAR(100),
  phone       VARCHAR(15),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE students (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name         VARCHAR(120) NOT NULL,
  email             VARCHAR(160) NOT NULL,
  mobile            VARCHAR(10)  NOT NULL CHECK (mobile ~ '^[6-9][0-9]{9}$'),
  dob               DATE,
  gender            VARCHAR(10) CHECK (gender IN ('Male','Female','Other')),
  address           VARCHAR(300),
  city              VARCHAR(80),
  state             VARCHAR(80),
  pin_code          VARCHAR(6) CHECK (pin_code ~ '^[0-9]{6}$'),
  guardian_name       VARCHAR(120),
  guardian_relation   VARCHAR(40),
  guardian_mobile     VARCHAR(10) CHECK (guardian_mobile ~ '^[6-9][0-9]{9}$'),
  guardian_occupation VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE departments (
  id     SERIAL PRIMARY KEY,
  code   VARCHAR(10)  NOT NULL UNIQUE,
  name   VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE courses (
  id             SERIAL PRIMARY KEY,
  department_id  INT NOT NULL REFERENCES departments(id),
  code           VARCHAR(20)  NOT NULL UNIQUE,
  name           VARCHAR(150) NOT NULL,
  degree         VARCHAR(10)  NOT NULL CHECK (degree IN ('B.E.','B.Tech','M.E.')),
  level          VARCHAR(2)   NOT NULL CHECK (level IN ('UG','PG')),
  duration_years SMALLINT     NOT NULL CHECK (duration_years BETWEEN 1 AND 6),
  eligibility    VARCHAR(300),
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- one row per course; amounts in INR. One-time charges are collected with the first-year payment.
CREATE TABLE fee_structures (
  id                       SERIAL PRIMARY KEY,
  course_id                INT NOT NULL UNIQUE REFERENCES courses(id) ON DELETE CASCADE,
  academic_year            VARCHAR(7) NOT NULL,
  tuition_fee_per_year     NUMERIC(10,2) NOT NULL CHECK (tuition_fee_per_year >= 0),
  admission_fee            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (admission_fee >= 0),
  caution_deposit          NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (caution_deposit >= 0),
  establishment_fee        NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (establishment_fee >= 0),
  electricity_fee_per_year NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (electricity_fee_per_year >= 0),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE applications (
  id                 SERIAL PRIMARY KEY,
  application_no     VARCHAR(20) UNIQUE,                 -- generated on submit, e.g. BEC26-00012
  student_id         INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id          INT REFERENCES courses(id),
  admission_category VARCHAR(12) CHECK (admission_category IN ('GOVERNMENT','MANAGEMENT','LATERAL')),
  academic_year      VARCHAR(7) NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN
    ('DRAFT','SUBMITTED','UNDER_VERIFICATION','DOCUMENTS_VERIFIED','APPROVED','REJECTED','FEE_PENDING','ADMISSION_CONFIRMED')),
  remarks            VARCHAR(500),
  submitted_at       TIMESTAMPTZ,
  decided_at         TIMESTAMPTZ,
  decided_by         INT REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, academic_year)
);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_course ON applications(course_id);

CREATE TABLE academic_details (
  id                     SERIAL PRIMARY KEY,
  application_id         INT NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,
  tenth_school           VARCHAR(150),
  tenth_percentage       NUMERIC(5,2) CHECK (tenth_percentage BETWEEN 0 AND 100),
  twelfth_school         VARCHAR(150),
  twelfth_percentage     NUMERIC(5,2) CHECK (twelfth_percentage BETWEEN 0 AND 100),
  passing_year           SMALLINT CHECK (passing_year BETWEEN 1990 AND 2100),
  previous_qualification VARCHAR(150)
);

CREATE TABLE documents (
  id             SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  doc_type       VARCHAR(20) NOT NULL CHECK (doc_type IN
    ('PHOTO','ID_PROOF','MARKSHEET_10','MARKSHEET_12','TRANSFER_CERT','COMMUNITY_CERT','INCOME_CERT','OTHER')),
  original_name  VARCHAR(200) NOT NULL,
  storage_key    VARCHAR(300) NOT NULL,                  -- S3 object key (or local path in dev)
  mime_type      VARCHAR(60)  NOT NULL,
  size_bytes     INT NOT NULL,
  status         VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VERIFIED','REJECTED')),
  remarks        VARCHAR(300),
  verified_by    INT REFERENCES users(id),
  verified_at    TIMESTAMPTZ,
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (application_id, doc_type)
);

CREATE TABLE payments (
  id              SERIAL PRIMARY KEY,
  application_id  INT NOT NULL REFERENCES applications(id),
  amount          NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  method          VARCHAR(12) NOT NULL CHECK (method IN ('UPI','CARD','NETBANKING')),
  status          VARCHAR(10) NOT NULL CHECK (status IN ('PENDING','SUCCESS','FAILED')),
  transaction_ref VARCHAR(40) NOT NULL UNIQUE,
  receipt_no      VARCHAR(24) UNIQUE,
  breakdown       JSONB NOT NULL,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- audit trail of every status change
CREATE TABLE admission_status (
  id             SERIAL PRIMARY KEY,
  application_id INT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status    VARCHAR(20),
  to_status      VARCHAR(20) NOT NULL,
  remarks        VARCHAR(500),
  changed_by     INT REFERENCES users(id),
  changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_status_app ON admission_status(application_id);

CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(150) NOT NULL,
  message    VARCHAR(500) NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE password_resets (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email      VARCHAR(160) NOT NULL,
  mobile     VARCHAR(20),
  code       VARCHAR(10) NOT NULL,
  token      VARCHAR(128) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_password_resets_email ON password_resets(email, code);
CREATE INDEX idx_password_resets_mobile ON password_resets(mobile, code);

