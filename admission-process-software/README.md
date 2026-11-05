# Admission Process Software - Bharathidasan Engineering College, Nattrampalli

A full-stack web application that digitises the college admission process: student registration → application
(personal, academic, course, documents) → officer verification → approval → fee payment → admission confirmation letter.

**Stack:** React (Vite) · Node.js + Express REST API · PostgreSQL · Amazon S3 for documents · deployable on AWS (EC2 / Elastic Beanstalk, RDS, S3, CloudFront, IAM, CloudWatch).

## Where the three photos are used

| Image (`frontend/public/images/`) | Used on |
|---|---|
| `campus-banner.jpg` (campus with hill backdrop) | Student Dashboard and Admin Dashboard banners |
| `admission-building.jpg` (blue building) | Admission Process page, Courses & Fees page (public) and Admin Courses & Fees page |
| `bec-logo.png` (college logo) | Student Login, Admin Login, Registration, navbar/sidebar brand, admission confirmation letter |

To swap a picture, replace the file with the same name.

## BEC courses and fee structure

Seeded by `database/seed.sql` and editable by the admin under **Admin → Courses & Fees**.

* **UG (4 years):** B.E. CSE, ECE, EEE, Mechanical, Civil · B.Tech Information Technology, Artificial Intelligence & Data Science
* **PG (2 years):** M.E. Computer Science & Engineering, Structural Engineering, Applied Electronics, Thermal Engineering
* **Fees (INR, 2026-27, indicative):** tuition 55,000/year (UG) and 60,000/year (PG); one-time/other charges: admission fee 500, caution deposit 5,000 (refundable), establishment 2,000, electricity 2,000/year.
  Payable at admission (first year) = **64,500 (UG) / 69,500 (PG)**.

> **Please verify before real use.** The college does not publish one definitive fee table online; these figures were compiled from public
> listings and differ between sources (government-quota and management-quota fees differ in reality). The AI&DS programme is listed by
> one source only. Confirm with the college office and update through the admin screen. College address/phone/email are in
> `frontend/src/config/college.js`.

## Project structure

```
admission-process-software/
├── database/            schema.sql, seed.sql
├── backend/
│   ├── server.js
│   ├── src/ config/ routes/ controllers/ models/ middleware/ services/ validators/
│   ├── scripts/         init-db.js, seed-users.js
│   ├── tests/           node:test unit tests
│   └── uploads/         local document storage (development only)
├── frontend/            React app (src/pages, components, context, services, styles)
└── deploy/aws/          IAM policy, nginx.conf, CloudWatch agent config
```

## Run locally

Prerequisites: Node.js 18+, PostgreSQL 13+.

```bash
# 1. database
createdb admission_db

# 2. backend
cd backend
cp .env.example .env          # edit DATABASE_URL and set JWT_SECRET
npm install
npm run setup                 # creates tables, loads BEC courses/fees, creates demo accounts
npm run dev                   # API on http://localhost:5000

# 3. frontend (new terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173  (proxies /api to :5000)
```

Demo accounts (created by `npm run db:seed-users`, passwords from `.env`):

| Role | Login | Password |
|---|---|---|
| Admin | admin@bec.ac.in | Admin@12345 |
| Admission Officer | officer@bec.ac.in | Officer@12345 |
| Student | student@example.com | Student@12345 |

**Change these passwords before any real deployment.** Admin/officer logs in at `/admin/login`, students at `/login`.

### Try the full workflow
1. Log in as the student → **Application Form** → fill the 4 steps (upload the 5 required documents: JPG/PNG/PDF, ≤ 2 MB) → **Submit**. An application number such as `BEC26-00001` is generated.
2. Log in as the officer → **Applications** → open it → **Verify** each document → **Mark documents verified** → **Approve** (or Reject with a reason).
3. Student → **Fee Payment** → pay (demo gateway) → **Admission Confirmation** → Print / Save as PDF.
4. Admin → **Dashboard** (counts + charts), **Reports**, **Courses & Fees**, **Manage Users**.

## Application status flow

`Draft → Submitted → Under Verification → Documents Verified → Approved → Fee Pending → Admission Confirmed`
(or `Rejected` before approval). Approval moves straight to Fee Pending. Every change is stored in `admission_status` and shown as a timeline.
Rules live in `backend/src/services/statusMachine.js`.

## REST API summary (all under `/api`)

| Area | Endpoints |
|---|---|
| Public | `GET /courses`, `GET /departments`, `GET /health` |
| Auth | `POST /auth/register`, `POST /auth/login` (portal: student/staff), `POST /auth/logout`, `GET /auth/me` |
| Student | `GET/PUT /student/applications/me`, `POST …/me/submit`, `POST …/me/pay`, `POST/DELETE …/me/documents` |
| Documents | `GET /documents/:id/file` (owner or staff only, streamed) |
| Notifications | `GET /notifications`, `PATCH /notifications/read`, `PATCH /notifications/:id/read` |
| Staff | `GET /admin/stats`, `GET /admin/applications` (search, status, course, department, date filters), `GET /admin/applications/:id`, `PATCH /admin/applications/:id/status`, `PATCH /admin/documents/:id`, `GET /admin/reports/summary`, `GET /admin/reports/applications.csv` |
| Admin only | `POST/PUT/DELETE /admin/courses` (includes fees), `GET/POST /admin/users`, `PATCH /admin/users/:id` |

## Security

* Passwords hashed with bcrypt (cost 12); strong-password rule; generic login errors; login/register rate limiting.
* JWT stored in an **httpOnly, SameSite=Strict, Secure (in production)** cookie - not accessible to JavaScript. The frontend and API are served from one origin (Vite proxy in dev, CloudFront/nginx in production).
* Role-based authorisation middleware (student / officer / admin) on every route group; students can only touch their own application and documents.
* Server-side validation with zod on every write; angle brackets stripped from free text; React escapes output; Helmet headers.
* SQL injection: parameterised queries only (dynamic column lists are whitelisted constants).
* File uploads: type whitelist (JPG/PNG/PDF), 2 MB limit, magic-byte check, random storage keys, private S3 bucket, files streamed only to authorised users.
* Fee amounts are always recomputed on the server. CSV export neutralises spreadsheet formula injection.
* No secrets in code: everything comes from environment variables; AWS credentials come from the instance IAM role.

## Tests

```bash
cd backend && npm test
```
Covers the status workflow rules, fee calculations and request validation/sanitisation. (Endpoints themselves need a running database; test them with the walkthrough above.)

## Deploying on AWS

Architecture: **User → CloudFront → (S3 static site for `/`, backend for `/api/*`) → EC2 / Elastic Beanstalk → RDS PostgreSQL**, documents in **S3**, logs in **CloudWatch**.

1. **RDS (PostgreSQL)** - create a `db.t3.micro` instance in a private subnet; allow inbound 5432 only from the backend's security group. Apply the schema once from the backend host:
   `DATABASE_URL=… DB_SSL=true NODE_ENV=production npm run db:init -- --force` then `npm run db:seed-users` (**init drops tables - run only on a fresh database**).
2. **S3 (documents)** - create a private bucket (Block all public access ON, default encryption on). Create an IAM policy from `deploy/aws/iam-policy.json` (replace the bucket name) and attach it to the backend's **IAM role**. Set `S3_BUCKET` and `AWS_REGION` in the environment - no access keys.
3. **Backend**
   * *EC2:* Amazon Linux 2023, install Node 20 + git, clone, `cd backend && npm ci --omit=dev`, create `.env` (see `.env.example`: `NODE_ENV=production`, 48+ char `JWT_SECRET`, `DATABASE_URL`, `DB_SSL=true`, `S3_BUCKET`, `CLIENT_ORIGIN=https://your-domain`), then `npm i -g pm2 && pm2 start ecosystem.config.js && pm2 save && pm2 startup`.
   * *Elastic Beanstalk:* zip the `backend/` folder (without node_modules), create a Node.js environment, set the same variables under Configuration → Environment properties, attach the IAM instance profile.
4. **Frontend** - `cd frontend && npm ci && npm run build`, then either upload `dist/` to an S3 bucket used as a CloudFront origin, or copy it to `/var/www/bec` on the EC2 host with `deploy/aws/nginx.conf`.
5. **CloudFront** - origin 1: the frontend bucket (default behaviour, error pages 403/404 → `/index.html` with 200 for React Router). Origin 2: the backend (ALB/EC2 DNS) for path pattern `/api/*` with caching disabled, all headers/cookies/query strings forwarded, methods GET…DELETE allowed. Add an ACM certificate and your domain; enforce HTTPS (required for the Secure cookie).
6. **CloudWatch** - Elastic Beanstalk can stream logs from its console settings; on EC2 install the CloudWatch agent with `deploy/aws/cloudwatch-agent.json`. Add alarms on 5xx count and CPU.

## Going further (not included)

* **Real payments:** replace `backend/src/services/paymentService.js` with a gateway such as Razorpay (create order → verify webhook signature). The rest of the flow already works with the returned reference.
* **Email:** set `SMTP_*` (Amazon SES SMTP works). Without them emails are only logged.
* The Contact page prepares an email in the visitor's mail app (there is no public mail endpoint).
