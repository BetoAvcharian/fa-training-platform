-- ============================================================
-- 010_events_audit_actions.sql
-- ============================================================

alter type audit_action add value 'event.create';
alter type audit_action add value 'event.assign';
alter type audit_action add value 'session_exercise.create';
alter type audit_action add value 'session_exercise.exception_create';
