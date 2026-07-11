-- ============================================================
-- 019_fix_self_select_membership.sql
-- ============================================================

drop policy if exists "self_select_own_membership" on memberships;

-- Antes consultaba `people` (person_id = select id from people where...),
-- que es el otro lado de la recursión descripta en 002. Ahora compara
-- directo contra el membership_id que ya viene en el JWT.
create policy "self_select_own_membership" on memberships
  for select using (id = auth_membership_id());
