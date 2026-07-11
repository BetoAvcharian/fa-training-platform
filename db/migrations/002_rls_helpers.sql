-- ============================================================
-- 002_rls_helpers.sql (v3 — leen del JWT, no de las tablas)
--
-- ⚠️ HISTORIA DE ESTE ARCHIVO (dejar documentado, no borrar el rastro):
-- Las primeras dos versiones de estas funciones consultaban
-- `memberships`/`people` directamente, asumiendo que SECURITY DEFINER
-- bastaba para saltear RLS. En la práctica generó una recursión infinita
-- real (confirmada contra la base de producción): memberships consulta
-- people vía self_select_own_membership, people consulta memberships vía
-- manager_select_org_people/coach_select_own_athletes_person — un ciclo.
--
-- LA SOLUCIÓN: un Custom Access Token Hook (ver 018_custom_access_token_hook.sql)
-- mete organization_id / membership_id / membership_role DENTRO del JWT
-- al iniciar sesión. Estas funciones ahora solo LEEN el JWT — cero
-- consultas a tablas, cero posibilidad estructural de recursión.
--
-- auth_coach_owns_athlete sigue consultando `memberships` (necesita
-- verificar una fila específica, no "quién soy yo") — es seguro porque
-- ya no depende de resolver "quién soy" vía otra tabla.
-- ============================================================

create or replace function auth_organization_id() returns uuid as $$
  select nullif(auth.jwt()->>'organization_id', '')::uuid;
$$ language sql stable;

create or replace function auth_role() returns membership_role as $$
  select nullif(auth.jwt()->>'membership_role', '')::membership_role;
$$ language sql stable;

create or replace function auth_membership_id() returns uuid as $$
  select nullif(auth.jwt()->>'membership_id', '')::uuid;
$$ language sql stable;

create or replace function auth_coach_owns_athlete(athlete_membership_id uuid) returns boolean as $$
  select exists (
    select 1 from public.memberships
    where id = athlete_membership_id
    and coach_membership_id = public.auth_membership_id()
  );
$$ language sql stable security definer set search_path = '';
