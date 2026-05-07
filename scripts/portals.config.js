/**
 * scripts/portals.config.js
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for all HIRIS portal identities,
 * preferred dev ports, and Vite config references.
 *
 * To add a new portal:
 *   1. Add an entry here
 *   2. Create apps/frontend/vite.config.<id>.js
 *   3. Create apps/frontend/<id>.html
 *   4. Create apps/frontend/src/portals/<id>/main.jsx + Routes.jsx
 *   5. Re-run start_all.sh — ports are allocated automatically.
 */

module.exports = [
  {
    id:        'backend',
    label:     'Backend API',
    preferred: 3001,
    // No vite config — this is the Express server
  },
  {
    id:        'landing',
    label:     'Landing Page',
    preferred: 5173,
    config:    'vite.config.js',
    mode:      null,
  },
  {
    id:        'faculty',
    label:     'Faculty Portal',
    preferred: 5174,
    config:    'vite.config.faculty.js',
    mode:      'faculty',
  },
  {
    id:        'hiring',
    label:     'Hiring Mgr Portal',
    preferred: 5175,
    config:    'vite.config.hiring.js',
    mode:      'hiring',
  },
  {
    id:        'chro',
    label:     'CHRO / Admin Portal',
    preferred: 5176,
    config:    'vite.config.chro.js',
    mode:      'chro',
  },
  {
    id:        'recruiter',
    label:     'Recruiter Portal',
    preferred: 5177,
    config:    'vite.config.recruiter.js',
    mode:      'recruiter',
  },
  {
    id:        'candidate',
    label:     'Candidate Portal',
    preferred: 5178,
    config:    'vite.config.candidate.js',
    mode:      'candidate',
  },
]
