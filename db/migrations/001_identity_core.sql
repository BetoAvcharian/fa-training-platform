-- ============================================================
-- 001_identity_core.sql
-- Organization / Person / Membership / AuditLog
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---------- Organization ----------
create table organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  join_code text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- Person ----------
-- Nace desacoplado de auth.users a propósito: un Membership puede existir
-- en estado 'invitado' antes de que exista cuenta. auth_user_id es
-- nullable por esa misma razón (se completa cuando la persona acepta la
-- invitación y crea su cuenta).
create table people (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create index idx_people_auth_user on people(auth_user_id);
create index idx_people_email on people(lower(email));

-- ---------- Membership ----------
create type membership_role as enum ('manager', 'coach', 'athlete');
create type membership_status as enum ('invitado', 'activo', 'inactivo');

create table memberships (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  person_id uuid references people(id) on delete cascade,
  invited_email text,
  role membership_role not null,
  status membership_status not null default 'activo',
  coach_membership_id uuid references memberships(id),
  created_at timestamptz not null default now(),

  constraint person_or_invite check (
    (person_id is not null) or (invited_email is not null)
  ),
  constraint coach_only_for_athletes check (
    (role = 'athlete') or (coach_membership_id is null)
  ),
  constraint active_athlete_needs_coach check (
    status != 'activo' or role != 'athlete' or coach_membership_id is not null
  ),
  constraint invited_has_no_person check (
    status != 'invitado' or person_id is null
  ),
  constraint active_has_person check (
    status != 'activo' or person_id is not null
  )
);

create unique index uq_membership_person_org
  on memberships(organization_id, person_id) where person_id is not null;
create index idx_memberships_org on memberships(organization_id);
create index idx_memberships_coach on memberships(coach_membership_id);

-- Integridad que un CHECK no puede expresar (requiere comparar contra otra
-- fila): el coach referenciado debe ser un coach real de la MISMA
-- organización. Vive en la base, no solo en el código de dominio, porque
-- es una garantía que no puede depender de disciplina del desarrollador
-- (Fase 10: "qué datos nunca deben calcularse/validarse solo al vuelo").
create or replace function validate_coach_same_org() returns trigger as $$
begin
  if new.coach_membership_id is not null then
    if not exists (
      select 1 from public.memberships
      where id = new.coach_membership_id
      and organization_id = new.organization_id
      and role = 'coach'
    ) then
      raise exception 'coach_membership_id debe ser un coach de la misma organización';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger trg_validate_coach_same_org
  before insert or update on memberships
  for each row execute function validate_coach_same_org();

-- ---------- AuditLog ----------
-- Vive desde esta primera migración, no se agrega después. `action` es un
-- enum cerrado (no texto libre) para que sea consultable/filtrable de
-- forma confiable entre todos los dominios que lo usen a futuro.
create type audit_action as enum (
  'membership.invite',
  'membership.reassign_coach',
  'membership.deactivate',
  'membership.accept_invite'
);

create table audit_logs (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id),
  actor_membership_id uuid references memberships(id),
  action audit_action not null,
  entity_type text not null,
  entity_id uuid not null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_org_date on audit_logs(organization_id, created_at desc);
create index idx_audit_entity on audit_logs(entity_type, entity_id);
