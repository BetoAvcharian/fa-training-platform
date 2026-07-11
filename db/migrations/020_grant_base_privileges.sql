-- ============================================================
-- 020_grant_base_privileges.sql
--
-- RLS es un filtro ADICIONAL sobre qué filas se ven — nunca alcanza sin
-- el permiso de base sobre la tabla en sí (GRANT). Faltaba desde la
-- primera migración del proyecto; recién se manifestó en el primer login
-- real de punta a punta.
-- ============================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on
  organizations, people, memberships, audit_logs,
  sports, units, observables, context_keys, catalog_visibility_overrides,
  groups, group_memberships, events, event_assignments, session_blocks, session_exercises, session_exercise_assignments,
  observations, observation_context_values, personal_records
to authenticated;

grant usage on all sequences in schema public to authenticated;
