-- ============================================================
-- 002_rls_helpers.sql (v2 — sin dependencia cruzada entre funciones)
-- ============================================================

-- security definer en las cuatro: sin esto, cada una re-dispara las
-- políticas RLS de `memberships`/`people` al leerlas desde dentro de otra
-- política que las invoca — riesgo directo de recursión infinita.
--
-- search_path = '' + nombres calificados (public.tabla): evita resolución
-- ambigua contra objetos temporales u otros esquemas.
--
-- ⚠️ DEUDA TÉCNICA DOCUMENTADA (decisión explícita del Ticket #2):
-- Las cuatro funciones asumen UNA membership activa por persona (limit 1).
-- Válido para el alcance actual del producto. Si aparece el caso real de
-- multi-organización, deben pasar a recibir organization_id como
-- parámetro — igual que ya lo hace requireRole() en el dominio.

create or replace function auth_organization_id() returns uuid as $$
  select organization_id from public.memberships
  where person_id = (select id from public.people where auth_user_id = auth.uid())
  and status = 'activo'
  limit 1;
$$ language sql stable security definer set search_path = '';

create or replace function auth_role() returns membership_role as $$
  select role from public.memberships
  where person_id = (select id from public.people where auth_user_id = auth.uid())
  and status = 'activo'
  limit 1;
$$ language sql stable security definer set search_path = '';

create or replace function auth_membership_id() returns uuid as $$
  select id from public.memberships
  where person_id = (select id from public.people where auth_user_id = auth.uid())
  and status = 'activo'
  limit 1;
$$ language sql stable security definer set search_path = '';

-- Corregida: antes llamaba a auth_membership_id() como función aparte.
-- Ahora repite el mismo subquery inline — se vuelve autosuficiente, no
-- depende de que otra función ya exista al momento de crearse. Mismo
-- resultado, cero riesgo de fallar por orden de ejecución.
create or replace function auth_coach_owns_athlete(athlete_membership_id uuid) returns boolean as $$
  select exists (
    select 1 from public.memberships
    where id = athlete_membership_id
    and coach_membership_id = (
      select id from public.memberships
      where person_id = (select id from public.people where auth_user_id = auth.uid())
      and status = 'activo'
      limit 1
    )
  );
$$ language sql stable security definer set search_path = '';
