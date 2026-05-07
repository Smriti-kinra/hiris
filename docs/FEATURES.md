# HIRIS Platform Features

Welcome to the HIRIS (Hiring Intelligence & Recruitment Information System) feature overview. HIRIS is designed with three distinct, role-based portals that streamline the recruitment lifecycle from the initial headcount request all the way to final interviews and organizational analytics.

Below is a detailed breakdown of the platform's core features, accompanied by animated walkthroughs.

---

## 0. Onboarding & Organisation Setup

The first time a new organization uses HIRIS, the CHRO or administrator can create an account and define their workflow in seconds.

### Key Features:
- **Org Customisation:** Define organization size, industry, and name to brand the workspace.
- **Roles & Permissions Builder:** Create and customize specific hiring roles (e.g., Hiring Manager vs Department Leader) with granular permissions.
- **Bulk Team Invites:** Pre-provision accounts for your entire hiring team in one step, automatically dispatching them to their correct portals.
- **Seamless Authentication:** Automatic login and session generation upon successful setup.

---

## 1. Hiring Manager Portal

The Hiring Manager Portal is designed for department heads and team leads to manage their active job openings, track candidate pipelines, and review interview schedules.

### Key Features:
- **Pipeline Dashboard:** A high-level view of pending requests, active openings, and total candidates.
- **Job Postings Manager:** View all active roles, urgency levels, and candidate counts at a glance.
- **Interview Scheduler:** Track upcoming and completed interviews with detailed candidate information and direct Calendly links.
- **New Request Modal:** Quickly submit new headcount requests directly to the CHRO.

![Hiring Manager Walkthrough](docs/assets/hiring_manager_portal_1777671007057.webp)

---

## 2. Faculty Portal

The Faculty Portal caters to academic staff involved in the hiring process. It allows professors and department chairs to request new faculty positions and review incoming candidates.

### Key Features:
- **My Requests:** Track the status of your submitted headcount requests (Pending, Under Review, Approved).
- **New Headcount Requests:** A streamlined form to request new positions, specifying the role, department, and urgency.
- **Candidate Review (JD Reviews):** Participate in reviewing candidate applications and providing AI-assisted feedback.
- **Dark/Light Mode:** Full support for professional dark and light themes across the platform.

![Faculty Portal Walkthrough](docs/assets/faculty_portal_demo_1777671083489.webp)

---

## 3. CHRO Portal (Executive Dashboard)

The Chief Human Resources Officer (CHRO) Portal provides a bird's-eye view of the entire organization's hiring intelligence, empowering executives to make data-driven decisions.

### Key Features:
- **Organization Overview:** Real-time metrics on total requests, pending approvals, and active openings.
- **Hiring Analytics:** Visualized data including the Hiring Funnel, Candidates by Source, and Jobs by Department.
- **Policy Management:** An interactive, accordion-style repository of organizational hiring policies and approval workflows.
- **CSV Export:** One-click export of hiring request reports for external auditing or offline review.

![CHRO Portal Walkthrough](docs/assets/chro_portal_demo_1777671231194.webp)

---

## Shared Platform Capabilities

- **Secure Authentication:** JWT-based session management utilizing `httpOnly` cookies for maximum XSS protection.
- **Responsive Design:** A mobile-first approach with a sliding navigation drawer, ensuring accessibility on any device.
- **Performance:** Optimized code-splitting utilizing React's `<Suspense>` boundaries ensures rapid page loads.
- **Resilience:** Global error boundaries catch unexpected crashes to provide a graceful recovery UI.
