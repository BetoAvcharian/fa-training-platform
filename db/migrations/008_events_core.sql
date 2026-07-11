-- ============================================================
-- 008_events_core.sql
-- Group / GroupMembership / Event / EventAssignment /
-- SessionBlock / SessionExercise / SessionExerciseAssignment
-- ============================================================

-- ---------- Group (mínimo — Fase 3) ----------
create table groups (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table group_memberships (
  group_id uuid not null references groups(id) on delete cascade,
  membership_id uuid not null references memberships(id) on delete cascade,
  primary key (group_id, membership_id)
);

-- ---------- Event ----------
create type event_type as enum (
  'entrenamiento', 'competencia', 'viaje', 'concentracion', 'medico', 'reunion'
);

create table events (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type event_type not null,
  title text not null,
  date date,                          -- null solo si is_template = true
  is_template boolean not null default false,
  created_by_membership_id uuid not null references memberships(id),
  created_at timestamptz not null default now(),

  constraint date_required_unless_template check (is_template or date is not null)
  -- plan_id se agrega en una migración posterior, cuando exista el
  -- dominio Plan (Fase 8.6) — deliberadamente fuera de este ticket.
);

create index idx_events_org_date on events(organization_id, date);
create index idx_events_template on events(organization_id) where is_template = true;

-- ---------- EventAssignment ----------
create type assignee_type as enum ('person', 'group');

create table event_assignments (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  assignee_type assignee_type not null,
  -- Referencia polimórfica DELIBERADA acá (no columnas separadas como
  -- decidimos para Observation.source_ref): a diferencia de aquel caso,
  -- acá solo hay DOS tipos posibles, cerrados por el enum, y ambos
  -- apuntan a tablas con IDs de la misma forma (uuid). El riesgo de "fila
  -- huérfana" que nos hizo descartar la referencia polimórfica en
  -- Observation se resuelve acá con el trigger de abajo, no con columnas
  -- separadas — dos únicas variantes no ameritan esa complejidad extra.
  assignee_id uuid not null,
  created_at timestamptz not null default now(),

  unique (event_id, assignee_type, assignee_id)
);

create index idx_event_assignments_event on event_assignments(event_id);
create index idx_event_assignments_assignee on event_assignments(assignee_type, assignee_id);

-- Integridad de la referencia polimórfica: valida que assignee_id
-- realmente exista en la tabla que corresponde según assignee_type.
create or replace function validate_event_assignee() returns trigger as $$
begin
  if new.assignee_type = 'person' then
    if not exists (select 1 from public.memberships where id = new.assignee_id and role = 'athlete') then
      raise exception 'assignee_id debe ser una membership de rol athlete';
    end if;
  elsif new.assignee_type = 'group' then
    if not exists (select 1 from public.groups where id = new.assignee_id) then
      raise exception 'assignee_id debe ser un group existente';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger trg_validate_event_assignee
  before insert or update on event_assignments
  for each row execute function validate_event_assignee();

-- ---------- SessionBlock (opcional — Fase 4) ----------
create table session_blocks (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  title text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_session_blocks_event on session_blocks(event_id);

-- ---------- SessionExercise ----------
-- Nota: cuando exista Observation (Ticket #5), cada línea "ejecutada"
-- generará una Observation con fulfills_observation_id apuntando a la
-- Observation "planificada" derivada de esta fila. Hasta entonces, esta
-- tabla es autosuficiente: guarda tanto el texto crudo como los campos
-- que el parser haya podido estructurar.
create table session_exercises (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references events(id) on delete cascade,
  session_block_id uuid references session_blocks(id) on delete cascade,
  order_index int not null default 0,

  raw_text text not null,
  is_structured boolean not null default false,
  observable_id uuid references observables(id),

  sets int,
  reps int,
  weight_kg numeric,
  distance_meters numeric,
  time_seconds numeric,
  rest_seconds numeric,

  replaces_id uuid references session_exercises(id),

  created_at timestamptz not null default now()
);

create index idx_session_exercises_event on session_exercises(event_id);
create index idx_session_exercises_block on session_exercises(session_block_id);
create index idx_session_exercises_replaces on session_exercises(replaces_id);

-- ---------- SessionExerciseAssignment ----------
-- Excepción individual o de subgrupo (Fase 4, decisión final del diseño):
-- una línea con filas acá vale SOLO para esos EventAssignment puntuales.
-- Sin filas acá = línea genérica, vale para todos los asignados al Event.
create table session_exercise_assignments (
  session_exercise_id uuid not null references session_exercises(id) on delete cascade,
  event_assignment_id uuid not null references event_assignments(id) on delete cascade,
  primary key (session_exercise_id, event_assignment_id)
);
