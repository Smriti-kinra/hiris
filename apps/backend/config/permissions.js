const PIPELINE_STAGES = [
  { key: 'applied', label: 'Applied' },
  { key: 'under_review', label: 'Under Review' },
  { key: 'technical_interview', label: 'Technical Interview' },
  { key: 'behavioral_interview', label: 'Behavioral Interview' },
  { key: 'final_review', label: 'Final Review' },
  { key: 'offered', label: 'Offered' },
  { key: 'rejected', label: 'Rejected' },
]

const PERMISSION_GROUPS = [
  {
    key: 'requests',
    label: 'Hiring Requests',
    permissions: [
      { key: 'can_request_jobs', label: 'Create requests' },
      { key: 'can_view_requests', label: 'View requests' },
      { key: 'can_view_all_requests', label: 'View all org requests' },
      { key: 'can_approve_requests', label: 'Approve or reject requests' },
    ],
  },
  {
    key: 'jobs',
    label: 'Job Postings',
    permissions: [
      { key: 'can_view_jobs', label: 'View jobs' },
      { key: 'can_build_jd', label: 'Build job descriptions' },
      { key: 'can_review_jd', label: 'Review job descriptions' },
      { key: 'can_post_jobs', label: 'Publish jobs' },
    ],
  },
  {
    key: 'candidates',
    label: 'Candidates',
    permissions: [
      { key: 'can_view_candidates', label: 'View candidates' },
      { key: 'can_update_candidate_notes', label: 'Update candidate notes' },
      { key: 'can_move_candidates', label: 'Move candidates through pipeline' },
    ],
  },
  {
    key: 'interviews',
    label: 'Interviews',
    permissions: [
      { key: 'can_view_interviews', label: 'View interviews' },
      { key: 'can_conduct_interview', label: 'Conduct interviews' },
      { key: 'can_make_final_decision', label: 'Make final decision' },
    ],
  },
  {
    key: 'governance',
    label: 'Governance',
    permissions: [
      { key: 'can_view_analytics', label: 'View analytics' },
      { key: 'can_view_policies', label: 'View policies' },
      { key: 'can_manage_policies', label: 'Manage policies' },
      { key: 'can_manage_team', label: 'Manage team' },
      { key: 'can_manage_roles', label: 'Manage roles' },
      { key: 'is_admin', label: 'Workspace administrator' },
    ],
  },
]

const ROLE_TEMPLATES = [
  {
    key: 'chro',
    name: 'CHRO',
    description: 'Owns governance, analytics, policies, final interviews, role setup, and approvals.',
    landing_portal: 'chro',
    home_path: '/chro',
    permissions: {
      can_request_jobs: false,
      can_view_requests: true,
      can_view_all_requests: true,
      can_approve_requests: true,
      can_view_jobs: true,
      can_build_jd: false,
      can_review_jd: true,
      can_post_jobs: true,
      can_view_candidates: true,
      can_update_candidate_notes: true,
      can_move_candidates: true,
      can_view_interviews: true,
      can_conduct_interview: true,
      can_make_final_decision: true,
      can_view_analytics: true,
      can_view_policies: true,
      can_manage_policies: true,
      can_manage_team: true,
      can_manage_roles: true,
      is_admin: true,
    },
    visible_stages: ['applied', 'under_review', 'technical_interview', 'behavioral_interview', 'final_review', 'offered', 'rejected'],
    permission_groups: ['requests', 'jobs', 'candidates', 'interviews', 'governance'],
  },
  {
    key: 'hiring-manager',
    name: 'Hiring Manager',
    description: 'Builds job descriptions, manages posted jobs, reviews early-stage candidates, and tracks requests.',
    landing_portal: 'hiring',
    home_path: '/hiring',
    permissions: {
      can_request_jobs: false,
      can_view_requests: true,
      can_view_all_requests: true,
      can_approve_requests: false,
      can_view_jobs: true,
      can_build_jd: true,
      can_review_jd: false,
      can_post_jobs: true,
      can_view_candidates: true,
      can_update_candidate_notes: true,
      can_move_candidates: true,
      can_view_interviews: true,
      can_conduct_interview: false,
      can_make_final_decision: false,
      can_view_analytics: true,
      can_view_policies: true,
      can_manage_policies: false,
      can_manage_team: false,
      can_manage_roles: false,
      is_admin: false,
    },
    visible_stages: ['applied', 'under_review'],
    permission_groups: ['requests', 'jobs', 'candidates'],
  },
  {
    key: 'recruiter',
    name: 'Recruiter',
    description: 'Coordinates candidate intake, screening, interview scheduling, and early pipeline movement.',
    landing_portal: 'hiring',
    home_path: '/hiring/candidates',
    permissions: {
      can_request_jobs: false,
      can_view_requests: true,
      can_view_all_requests: false,
      can_approve_requests: false,
      can_view_jobs: true,
      can_build_jd: false,
      can_review_jd: false,
      can_post_jobs: false,
      can_view_candidates: true,
      can_update_candidate_notes: true,
      can_move_candidates: true,
      can_view_interviews: true,
      can_conduct_interview: false,
      can_make_final_decision: false,
      can_view_analytics: false,
      can_view_policies: true,
      can_manage_policies: false,
      can_manage_team: false,
      can_manage_roles: false,
      is_admin: false,
    },
    visible_stages: ['applied', 'under_review', 'technical_interview', 'behavioral_interview'],
    permission_groups: ['requests', 'jobs', 'candidates', 'interviews'],
  },
  {
    key: 'faculty',
    name: 'Faculty',
    description: 'Submits requests, reviews JDs, and conducts technical interviews.',
    landing_portal: 'faculty',
    home_path: '/faculty',
    permissions: {
      can_request_jobs: true,
      can_view_requests: true,
      can_view_all_requests: false,
      can_approve_requests: false,
      can_view_jobs: true,
      can_build_jd: false,
      can_review_jd: true,
      can_post_jobs: false,
      can_view_candidates: true,
      can_update_candidate_notes: true,
      can_move_candidates: false,
      can_view_interviews: true,
      can_conduct_interview: true,
      can_make_final_decision: false,
      can_view_analytics: false,
      can_view_policies: true,
      can_manage_policies: false,
      can_manage_team: false,
      can_manage_roles: false,
      is_admin: false,
    },
    visible_stages: ['technical_interview'],
    permission_groups: ['requests', 'jobs', 'candidates', 'interviews'],
  },
]

function permissionKeys() {
  return PERMISSION_GROUPS.flatMap(group => group.permissions.map(permission => permission.key))
}

function defaultPermissions(overrides = {}) {
  const base = Object.fromEntries(permissionKeys().map(key => [key, false]))
  return { ...base, ...overrides }
}

function normalizePermissions(permissions = {}) {
  const keys = permissionKeys()
  return Object.fromEntries(keys.map(key => [key, !!permissions[key]]))
}

function normalizeVisibleStages(stages = []) {
  const allowed = new Set(PIPELINE_STAGES.map(stage => stage.key))
  return Array.isArray(stages) ? stages.filter(stage => allowed.has(stage)) : []
}

function slugifyRoleName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

module.exports = {
  PIPELINE_STAGES,
  PERMISSION_GROUPS,
  ROLE_TEMPLATES,
  defaultPermissions,
  normalizePermissions,
  normalizeVisibleStages,
  permissionKeys,
  slugifyRoleName,
}
