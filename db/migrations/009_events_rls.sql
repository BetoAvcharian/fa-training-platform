-- ============================================================
-- 009_events_rls.sql (v2 — sin dependencia cruzada entre funciones)
--
-- Mismo problema que ya pisamos en 002: si el editor de Supabase corta
-- la ejecución a mitad de un paste largo, una función que llama a otra
-- función del mismo archivo puede fallar con "does not exist" aunque el
-- archivo esté completo. Corrección: cada función repite el subquery de
-- "membership activa del usuario actual" en vez de llamar a
-- auth_membership_id() como función aparte — se vuelve autosuficiente.
-- ============================================================

create or replace function auth_person_in_group(p_group_id uuid) returns boolean as $$
  select exists (
    select 1 from public.group_memberships gm
    join public.memberships m on m.id = gm.membership_id
    where gm.group_id = p_group_id
    and m.person_id = (select id from public.people where auth_user_id = auth.uid())
    and m.status = 'activo'
  );
$$ language sql stable security definer set search_path = '';

create or replace function auth_is_assigned_to_event(p_event_id uuid) returns boolean as $$
  select exists (
    select 1 from public.event_assignments ea
    where ea.event_id = p_event_id
    and (
      (ea.assignee_type = 'person' and ea.assignee_id = (
        select id from public.memberships
        where person_id = (select id from public.people where auth_user_id = auth.uid())
        and status = 'activo'
        limit 1
      ))
      or (ea.assignee_type = 'group' and auth_person_in_group(ea.assignee_id))
    )
  );
$$ language sql stable security definer set search_path = '';

create or replace function auth_coach_can_view_event(p_event_id uuid) returns boolean as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id and e.created_by_membership_id = (
      select id from public.memberships
      where person_id = (select id from public.people where auth_user_id = auth.uid())
      and status = 'activo'
      limit 1
    )
  ) or exists (
    select 1 from public.event_assignments ea
    join public.memberships m on m.id = ea.assignee_id and ea.assignee_type = 'person'
    where ea.event_id = p_event_id
    and m.coach_membership_id = (
      select id from public.memberships
      where person_id = (select id from public.people where auth_user_id = auth.uid())
      and status = 'activo'
      limit 1
    )
  );
$$ language sql stable security definer set search_path = '';

create or replace function auth_can_view_event(p_event_id uuid) returns boolean as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
    and e.organization_id = auth_organization_id()
    and (
      auth_role() = 'manager'
      or (auth_role() = 'coach' and auth_coach_can_view_event(e.id))
      or (auth_role() = 'athlete' and auth_is_assigned_to_event(e.id))
    )
  );
$$ language sql stable security definer set search_path = '';

create or replace function auth_can_manage_event(p_event_id uuid) returns boolean as $$
  select exists (
    select 1 from public.events e
    where e.id = p_event_id
    and e.organization_id = auth_organization_id()
    and (
      auth_role() = 'manager'
      or (auth_role() = 'coach' and e.created_by_membership_id = (
        select id from public.memberships
        where person_id = (select id from public.people where auth_user_id = auth.uid())
        and status = 'activo'
        limit 1
      ))
    )
  );
$$ language sql stable security definer set search_path = '';

-- ---------- Groups ----------
alter table groups enable row level security;
alter table group_memberships enable row level security;

create policy "org_select_groups" on groups
  for select using (organization_id = auth_organization_id());

create policy "staff_manage_groups" on groups
  for all using (
    organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
  );

create policy "org_select_group_memberships" on group_memberships
  for select using (
    exists (select 1 from groups g where g.id = group_id and g.organization_id = auth_organization_id())
  );

create policy "staff_manage_group_memberships" on group_memberships
  for all using (
    exists (
      select 1 from groups g
      where g.id = group_id and g.organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
    )
  );

-- ---------- Events ----------
alter table events enable row level security;

create policy "select_events" on events
  for select using (auth_can_view_event(id));

create policy "staff_insert_events" on events
  for insert with check (
    organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
    and created_by_membership_id = (
      select id from public.memberships
      where person_id = (select id from public.people where auth_user_id = auth.uid())
      and status = 'activo'
      limit 1
    )
  );

create policy "staff_update_own_events" on events
  for update using (auth_can_manage_event(id));

create policy "staff_delete_own_events" on events
  for delete using (auth_can_manage_event(id));

-- ---------- EventAssignment ----------
alter table event_assignments enable row level security;

create policy "select_event_assignments" on event_assignments
  for select using (auth_can_view_event(event_id));

create policy "staff_manage_event_assignments" on event_assignments
  for all using (auth_can_manage_event(event_id));

-- ---------- SessionBlock / SessionExercise ----------
alter table session_blocks enable row level security;
alter table session_exercises enable row level security;
alter table session_exercise_assignments enable row level security;

create policy "select_session_blocks" on session_blocks
  for select using (auth_can_view_event(event_id));

create policy "staff_manage_session_blocks" on session_blocks
  for all using (auth_can_manage_event(event_id));

create policy "select_session_exercises" on session_exercises
  for select using (auth_can_view_event(event_id));

create policy "staff_manage_session_exercises" on session_exercises
  for all using (auth_can_manage_event(event_id));

create policy "select_session_exercise_assignments" on session_exercise_assignments
  for select using (
    exists (select 1 from session_exercises se where se.id = session_exercise_id and auth_can_view_event(se.event_id))
  );

create policy "staff_manage_session_exercise_assignments" on session_exercise_assignments
  for all using (
    exists (select 1 from session_exercises se where se.id = session_exercise_id and auth_can_manage_event(se.event_id))
  );
