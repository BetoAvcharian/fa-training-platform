-- ============================================================
-- 012_observations_core.sql
-- Observation / ObservationContextValue / PersonalRecord
--
-- Observation es el núcleo del dominio (principio 18): récords,
-- rankings, progresiones y la futura analítica de carga leen TODOS de
-- esta única tabla.
-- ============================================================

create type observation_source_type as enum (
  'competencia', 'entrenamiento', 'assessment', 'wearable', 'manual', 'importacion', 'checkin'
);
create type observation_state as enum ('planificado', 'ejecutado', 'omitido');
create type observation_validation_status as enum (
  'no_verificado', 'verificado', 'oficial', 'importado_sin_validar'
);

create table observations (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  athlete_membership_id uuid not null references memberships(id) on delete cascade,
  observable_id uuid not null references observables(id),
  value numeric not null,
  date date not null,
  source_type observation_source_type not null,

  -- source_ref (Fase 3): columnas nullable separadas, no
  -- source_type+source_id sin FK ni una tabla Source intermedia.
  -- assessment_id / import_id sin FK todavía — esos dominios no existen
  -- aún; se agrega la referencia real cuando se construyan.
  event_id uuid references events(id),
  assessment_id uuid,
  import_id uuid,

  validation_status observation_validation_status not null default 'no_verificado',
  state observation_state not null default 'ejecutado',

  fulfills_observation_id uuid references observations(id),
  superseded_by uuid references observations(id),

  notes text,
  created_by_membership_id uuid not null references memberships(id),
  created_at timestamptz not null default now()
);

create index idx_observations_athlete_observable_date on observations(athlete_membership_id, observable_id, date);
create index idx_observations_source on observations(athlete_membership_id, source_type);
create index idx_observations_event on observations(event_id);
create index idx_observations_vigente on observations(athlete_membership_id, observable_id) where superseded_by is null;

create table observation_context_values (
  observation_id uuid not null references observations(id) on delete cascade,
  context_key_id uuid not null references context_keys(id),
  value_numeric numeric,
  value_text text,
  value_boolean boolean,

  primary key (observation_id, context_key_id)
);

create table personal_records (
  id uuid primary key default uuid_generate_v4(),
  athlete_membership_id uuid not null references memberships(id) on delete cascade,
  observable_id uuid not null references observables(id),
  record_type text not null check (record_type in ('oficial', 'entrenamiento')),
  best_observation_id uuid not null references observations(id),
  value numeric not null,
  achieved_date date not null,
  updated_at timestamptz not null default now(),

  unique (athlete_membership_id, observable_id, record_type)
);

create index idx_personal_records_athlete on personal_records(athlete_membership_id);
