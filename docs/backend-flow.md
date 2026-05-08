# HIRIS — Backend Flow & API Reference

## Request Lifecycle

Every API request from a portal follows this path:

```
Browser (Portal)
  │
  │  fetch('/api/candidates', { credentials: 'include' })
  │
  ▼
Vite Dev Server (e.g. :5176)
  │  proxy: { '/api': 'http://localhost:3001' }
  │
  ▼
Express App (:3001)
  │
  ├─ Sentry.requestHandler()          ← error tracking
  ├─ helmet()                         ← security headers
  ├─ morgan()                         ← request logging
  ├─ cors()                           ← ALLOWED_ORIGINS check
  ├─ express.json()                   ← body parsing
  ├─ cookieParser()                   ← JWT cookie parsing
  ├─ rateLimit()                      ← 1000 req/15min global
  │
  ├─ route matched → /api/candidates
  │
  ├─ requireAuth()  middleware
  │    └─ reads JWT from httpOnly cookie
  │    └─ verifies signature (JWT_SECRET)
  │    └─ queries DB: users + roles + permissions
  │    └─ attaches req.currentUser = { userId, orgId, portal, permissions }
  │
  ├─ requirePermission('can_view_candidates')  middleware
  │    └─ checks req.currentUser.permissions.can_view_candidates === true
  │    └─ 403 if missing
  │
  ├─ Route handler
  │    └─ DB query filtered by req.currentUser.orgId (multi-tenant isolation)
  │    └─ Returns JSON
  │
  ├─ Sentry.errorHandler()            ← catches unhandled errors
  └─ Global error handler             ← sanitizes error message for client
```

---

## Authentication Flow

### Login

```
POST /api/auth/login  { email, password }
  │
  ├─ SELECT user + role + permissions WHERE email = $1
  ├─ bcrypt.compare(password, user.password_hash)
  ├─ Build JWT payload:
  │    { userId, orgId, portal, home_path, permissions: { can_view_candidates, ... } }
  ├─ jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
  └─ res.cookie('hiris_token', token, { httpOnly: true, sameSite: 'lax' })
     res.json({ user: { ...payload } })
```

### JWT Verification (every protected request)

```
requireAuth middleware
  ├─ req.cookies.hiris_token  OR  Authorization: Bearer <token>
  ├─ jwt.verify(token, JWT_SECRET)
  ├─ SELECT u.id, u.org_id, r.permissions, r.visible_stages, r.landing_portal
     FROM users u JOIN roles r ON r.id = u.role_id
     WHERE u.id = payload.userId
  └─ req.currentUser = { userId, orgId, portal, permissions, visibleStages }
```

### Logout

```
POST /api/auth/logout
  └─ res.clearCookie('hiris_token')
```

---

## RBAC — Role-Based Access Control

Roles are stored in PostgreSQL with a JSONB permissions field:

```sql
CREATE TABLE roles (
  id              SERIAL PRIMARY KEY,
  org_id          INTEGER REFERENCES orgs(id),
  name            VARCHAR(100) NOT NULL,
  landing_portal  VARCHAR(50),          -- 'chro' | 'faculty' | 'hiring' | ...
  visible_stages  TEXT[],               -- ['applied', 'under_review', ...]
  permissions     JSONB NOT NULL DEFAULT '{}'
);
```

**Example permissions object:**
```json
{
  "can_view_analytics":    true,
  "can_view_candidates":   true,
  "can_manage_team":       true,
  "can_view_policies":     true,
  "can_manage_policies":   true,
  "can_make_final_decision": true,
  "can_view_interviews":   true,
  "can_conduct_interview": true,
  "can_view_requests":     true,
  "can_review_jd":         false,
  "is_admin":              true
}
```

The JWT embeds the full permissions object. Every backend route checks a specific permission using:
```js
requirePermission('can_view_analytics')
requireAnyPermission(['can_view_interviews', 'can_conduct_interview'])
```

---

## API Route Map

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `POST` | `/api/auth/login` | Public | Login |
| `POST` | `/api/auth/logout` | Auth | Logout |
| `GET` | `/api/auth/me` | Auth | Current user |
| `GET` | `/api/dashboard/stats` | `can_view_analytics` | Dashboard stats |
| `GET` | `/api/hiring-requests` | `can_view_requests` | All requests |
| `POST` | `/api/hiring-requests` | `can_request_jobs` | Create request |
| `PATCH` | `/api/hiring-requests/:id/status` | `can_review_jd` | Approve/reject |
| `GET` | `/api/candidates` | `can_view_candidates` | Candidate list |
| `GET` | `/api/candidates/:id` | `can_view_candidates` | Candidate profile |
| `POST` | `/api/candidates/:id/stage` | `can_view_candidates` | Move stage |
| `GET` | `/api/interviews` | `can_view_interviews` | Interview list |
| `POST` | `/api/interviews` | `can_view_interviews` | Schedule interview |
| `GET` | `/api/archive/overview` | `can_view_analytics` | Archive stats |
| `GET` | `/api/archive/employees` | `can_view_analytics` | Employee list |
| `GET` | `/api/archive/expired-jobs` | `can_view_analytics` | Expired postings |
| `GET` | `/api/archive/analytics` | `can_view_analytics` | Retention/attrition |
| `GET` | `/api/chro/institutional-values` | `can_view_policies` | Latest policy PDF |
| `POST` | `/api/chro/institutional-values` | `can_manage_policies` | Upload policy PDF |
| `GET` | `/api/roles` | `can_manage_roles` | All roles |
| `POST` | `/api/roles` | `can_manage_roles` | Create role |
| `GET` | `/api/jobs/apply/:token` | Public | Public job listing |
| `POST` | `/api/jobs/apply/:token` | Public | Submit application |
| `GET` | `/api/ai/behavioral-questions/:applicationId` | Auth | AI questions |
| `POST` | `/api/ai/evaluate-interview` | Auth | AI evaluation |

---

## AI Services Flow

### On Application Submission
```
POST /api/jobs/apply/:token
  │
  ├─ Insert candidate + application records
  │
  └─ Background (non-blocking):
       ├─ Parse resume PDF (pdf-parse)
       ├─ Fetch institutional values PDF
       ├─ Call Gemini 2.5 Flash Lite:
       │    prompt = resume + application answers + AI chat + policy docs
       │    → returns: ai_summary, behavioral_questions[10], alignment_score
       └─ UPDATE candidates SET ai_score = alignment_score
          INSERT INTO candidate_summaries (summary_text, behavioral_questions)
```

### On Interview Completion
```
POST /api/ai/evaluate-interview  { sessionId, audioBase64 }
  │
  ├─ Send audio → Groq Whisper API → transcript text
  │
  └─ Call Gemini 2.5 Flash Lite:
       prompt = transcript + resume + ai_summary + institutional values
       → returns: trait_scores { communication, leadership, ... }
                  strengths[], concerns[]
       INSERT INTO interview_evaluations (session_id, scores, strengths, concerns)
```
