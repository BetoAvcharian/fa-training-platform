-- ============================================================
-- 015_observations_audit_actions.sql
-- ============================================================

alter type audit_action add value 'observation.create';
alter type audit_action add value 'observation.correct';
