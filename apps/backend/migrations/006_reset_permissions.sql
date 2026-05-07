-- Reset role permissions to match ROLE_TEMPLATES in permissions.js

-- CHRO
UPDATE roles SET permissions = '{
  "can_request_jobs": false,
  "can_view_requests": true,
  "can_view_all_requests": true,
  "can_approve_requests": true,
  "can_view_jobs": true,
  "can_build_jd": false,
  "can_review_jd": true,
  "can_post_jobs": true,
  "can_view_candidates": true,
  "can_update_candidate_notes": true,
  "can_move_candidates": true,
  "can_view_interviews": true,
  "can_conduct_interview": true,
  "can_make_final_decision": true,
  "can_view_analytics": true,
  "can_view_policies": true,
  "can_manage_policies": true,
  "can_manage_team": true,
  "can_manage_roles": true,
  "is_admin": true
}'::jsonb WHERE name = 'CHRO';

-- Hiring Manager
UPDATE roles SET permissions = '{
  "can_request_jobs": false,
  "can_view_requests": true,
  "can_view_all_requests": true,
  "can_approve_requests": false,
  "can_view_jobs": true,
  "can_build_jd": true,
  "can_review_jd": false,
  "can_post_jobs": true,
  "can_view_candidates": true,
  "can_update_candidate_notes": true,
  "can_move_candidates": true,
  "can_view_interviews": true,
  "can_conduct_interview": false,
  "can_make_final_decision": false,
  "can_view_analytics": true,
  "can_view_policies": true,
  "can_manage_policies": false,
  "can_manage_team": false,
  "can_manage_roles": false,
  "is_admin": false
}'::jsonb WHERE name = 'Hiring Manager';

-- Faculty
UPDATE roles SET permissions = '{
  "can_request_jobs": true,
  "can_view_requests": true,
  "can_view_all_requests": false,
  "can_approve_requests": false,
  "can_view_jobs": true,
  "can_build_jd": false,
  "can_review_jd": true,
  "can_post_jobs": false,
  "can_view_candidates": true,
  "can_update_candidate_notes": true,
  "can_move_candidates": false,
  "can_view_interviews": true,
  "can_conduct_interview": true,
  "can_make_final_decision": false,
  "can_view_analytics": false,
  "can_view_policies": true,
  "can_manage_policies": false,
  "can_manage_team": false,
  "can_manage_roles": false,
  "is_admin": false
}'::jsonb WHERE name = 'Faculty';
