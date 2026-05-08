# HIRIS — System Architecture

## Overview

HIRIS (Hiring Intelligence & Recruitment Information System) is a multi-portal enterprise ATS built as a centralized SaaS. All portals share a **single backend API** and **single PostgreSQL database** while running as fully isolated frontend applications on dedicated ports.

```
┌─────────────────────────────────────────────────────────────────┐
│                    HIRIS FRONTEND PORTALS                       │
│                                                                 │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐      │
│  │ Landing   │ │  Faculty  │ │ Hiring Mgr│ │   CHRO    │      │
│  │ :5173     │ │  :5174    │ │ :5175     │ │ :5176     │      │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘      │
│        │             │             │             │             │
│  ┌─────┴─────┐ ┌─────┴─────┐                                   │
│  │ Recruiter │ │ Candidate │                                   │
│  │ :5177     │ │ :5178     │                                   │
│  └─────┬─────┘ └─────┬─────┘                                   │
└────────┼─────────────┼───────────────────────────────────────-─┘
         │  All portals proxy /api/* and /uploads/*               │
         ▼                                                        │
┌─────────────────────────────────────────────────────────────────┐
│                 SHARED BACKEND API (Express)                    │
│                      http://localhost:3001                      │
│                                                                 │
│  /api/auth          Authentication & JWT                        │
│  /api/candidates    Candidate workflow                          │
│  /api/interviews    Interview pipeline                          │
│  /api/archive       Archive & employee lifecycle                │
│  /api/chro/*        CHRO-scoped operations                      │
│  /api/pipeline      Stage transitions                           │
│  /api/roles         RBAC management                             │
│  /api/ai/*          AI evaluation services                      │
│  /api/jobs/*        Public job portal                           │
│  /api/archive/*     Workforce archive & analytics               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              SINGLE POSTGRESQL DATABASE                         │
│              postgresql://localhost:5432/hiris_db               │
│                                                                 │
│  orgs                  organizations (multi-tenant)             │
│  users                 all users across all portals             │
│  roles                 dynamic RBAC roles                       │
│  jobs                  job postings                             │
│  headcount_requests    faculty/HM hiring requests               │
│  candidates            applicant profiles                       │
│  applications          job applications                         │
│  interview_sessions    all interview records                     │
│  employee_profiles     hired employee records                   │
│  employee_lifecycle_events  promotion/exit audit log            │
│  expired_job_archive   auto-archived closed postings            │
│  policy_documents      institutional values PDFs                │
│  candidate_summaries   AI-generated evaluations                 │
│  workforce_insights_cache  pre-computed analytics               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Portal Responsibilities

| Portal | Port | Primary Users | Key Pages |
|--------|------|---------------|-----------|
| Landing | 5173 | Public | Home, Pricing, Org Signup |
| Faculty | 5174 | Faculty / Professors | Requests, JD Reviews, Technical Interviews |
| Hiring Manager | 5175 | Hiring Managers | Job Builder, Requests, Candidates, Schedule |
| CHRO / Admin | 5176 | CHRO, Org Admins | Dashboard, Analytics, Policies, Team, Archive |
| Recruiter | 5177 | Recruiters | Candidates, Posted Jobs, Schedule |
| Candidate | 5178 | Job Applicants | Application Portal (public, no auth) |

---

## Key Design Decisions

### 1. Shared Backend, Isolated Frontends
Every portal is a fully independent Vite application with its own:
- HTML entry point (`chro.html`, `faculty.html`, …)
- Vite config (`vite.config.chro.js`, …)
- Route tree (`ChroRoutes.jsx`, `FacultyRoutes.jsx`, …)
- Dev port
- `.env.{portal}` file

But all portals proxy `/api/*` requests to the same backend at `:3001`. This means **zero data duplication**.

### 2. Multi-Tenant Architecture
All database tables include `org_id`. When a user logs in, the JWT embeds their `orgId`, which is enforced in every backend query via middleware. One HIRIS instance can serve multiple institutions.

### 3. RBAC — Dynamic Role-Based Access Control
Roles are stored in the `roles` table with a JSONB `permissions` field and a `visible_stages` array. Permissions are evaluated server-side on every request. The frontend reads permissions from the JWT payload to control UI visibility.

### 4. PortalGuard — Cross-Portal Isolation
When a Faculty user accidentally opens the CHRO portal URL, `PortalGuard.jsx` reads `user.portal` from the JWT and performs a hard `window.location.href` redirect to the correct portal. No cross-portal data leakage is possible.

### 5. Dynamic Port Allocation
All port assignments flow through `scripts/portals.config.js`. At startup, `find-ports.js` finds free ports and `inject-env.js` writes updated `.env.{portal}` files before Vite reads them. No manual port editing is ever required.

---

## Data Flow Example: Candidate Applies for a Job

```
1. Candidate opens http://localhost:5178/jobs/apply/<token>
   └─ Candidate portal (Vite, port 5178)

2. Vite proxies GET /api/jobs/apply/<token> → Backend (:3001)
   └─ backend queries: jobs, headcount_requests, job_applications

3. Candidate fills form, submits POST /api/jobs/apply/<token>
   └─ backend inserts: candidates, applications
   └─ background job: parse resume → call Gemini AI → store candidate_summaries

4. CHRO opens http://localhost:5176/chro/candidates
   └─ CHRO portal (Vite, port 5176)
   └─ GET /api/candidates → same DB row created in step 3

5. CHRO schedules behavioral interview
   └─ POST /api/interviews → interview_sessions row inserted
   └─ Faculty interview room reads same row at http://localhost:5174/...
```

All portals see the same data because they share one database.

---

## Security Architecture

| Layer | Mechanism |
|-------|-----------|
| Transport | HTTPS in production (nginx TLS termination) |
| Authentication | JWT in HTTP-only cookies (no localStorage) |
| Authorization | Server-side permission checks on every endpoint |
| CORS | Backend allows only registered portal origins (`ALLOWED_ORIGINS`) |
| Rate limiting | `/api/auth/login` → max 10 req/15min per IP |
| Input validation | `express-async-errors` + per-route validation |
| Error monitoring | Sentry (request handler + error handler) |
| Secrets | All in `.env`, never committed to git |
