-- ============================================================
-- 014_observations_rls.sql
-- ============================================================

alter table observations enable row level security;
alter table observation_context_values enable row level security;
alter table personal_records enable row level security;

-- ---------- Observations ----------
-- Sin filtrar "vigente" acá a propósito: la historia completa (incluidas
-- filas ya corregidas) sigue visible para dueño/coach — filtrar por
-- superseded_by es trabajo de la capa de queries del dominio, no de la
-- seguridad de acceso.
create policy "athlete_manage_own_observations" on observations
  for all using (
    athlete_membership_id = (
      select id from public.memberships
      where person_id = (select id from public.people where auth_user_id = auth.uid())
      and status = 'activo'
      limit 1
    )
  );

create policy "coach_manage_athlete_observations" on observations
  for all using (public.auth_coach_owns_athlete(athlete_membership_id));

create policy "manager_select_org_observations" on observations
  for select using (
    organization_id = public.auth_organization_id() and public.auth_role() = 'manager'
  );

-- ---------- Observation context values ----------
create policy "select_context_values" on observation_context_values
  for select using (
    exists (
      select 1 from public.observations o
      where o.id = observation_id
      and (
        o.athlete_membership_id = (
          select id from public.memberships
          where person_id = (select id from public.people where auth_user_id = auth.uid())
          and status = 'activo'
          limit 1
        )
        or public.auth_coach_owns_athlete(o.athlete_membership_id)
        or (o.organization_id = public.auth_organization_id() and public.auth_role() = 'manager')
      )
    )
  );

create policy "manage_own_context_values" on observation_context_values
  for insert with check (
    exists (
      select 1 from public.observations o
      where o.id = observation_id
      and (
        o.athlete_membership_id = (
          select id from public.memberships
          where person_id = (select id from public.people where auth_user_id = auth.uid())
          and status = 'activo'
          limit 1
        )
        or public.auth_coach_owns_athlete(o.athlete_membership_id)
      )
    )
  );

-- ---------- Personal records ----------
-- 100% derivado: SELECT abierto a quien puede ver al atleta, sin policy
-- de insert/update/delete para ningún rol de aplicación — solo lo
-- escribe el trigger, nunca una mutation del dominio.
create policy "athlete_select_own_records" on personal_records
  for select using (
    athlete_membership_id = (
      select id from public.memberships
      where person_id = (select id from public.people where auth_user_id = auth.uid())
      and status = 'activo'
      limit 1
    )
  );

create policy "coach_select_athlete_records" on personal_records
  for select using (public.auth_coach_owns_athlete(athlete_membership_id));

create policy "manager_select_org_records" on personal_records
  for select using (
    exists (
      select 1 from public.memberships m
      where m.id = athlete_membership_id
      and m.organization_id = public.auth_organization_id()
      and public.auth_role() = 'manager'
    )
  );
