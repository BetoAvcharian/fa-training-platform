-- ============================================================
-- 004_catalog_core.sql
-- Sport / Unit / Observable / ContextKey
--
-- Patrón "global + por organización" en las cuatro tablas:
-- organization_id = null  → catálogo global (seed, común a todo el
--                            sistema, solo se carga vía service_role)
-- organization_id = <uuid> → extensión propia de esa organización
--
-- unique index PARCIAL (no constraint de tabla) porque un unique
-- constraint normal trata cada NULL como distinto entre sí — dejaría
-- crear "100m" global duplicado sin detectarlo. Con dos índices
-- parciales, "100m" es único entre los globales, y único por
-- organización entre los propios de cada una.
-- ============================================================

-- ---------- Sport ----------
create table sports (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create unique index uq_sports_global on sports(name) where organization_id is null;
create unique index uq_sports_org on sports(organization_id, name) where organization_id is not null;

-- ---------- Unit ----------
create table units (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  symbol text not null,
  category text not null check (
    category in ('masa', 'tiempo', 'distancia', 'velocidad', 'frecuencia_cardiaca', 'potencia', 'escala', 'temperatura')
  ),
  base_unit_id uuid references units(id),
  conversion_type text not null check (conversion_type in ('lineal', 'formula')),
  -- lineal: {"factor": 0.453592}  (ej: lb -> kg)
  -- formula: {"formula": "celsius_to_fahrenheit"}  (nombre de una función
  --   registrada en domains/catalog/rules.ts — no hay evaluación de
  --   expresiones arbitrarias en la base, por seguridad y simplicidad)
  conversion_params jsonb not null default '{}',
  created_at timestamptz not null default now(),

  constraint lineal_needs_factor check (
    conversion_type != 'lineal' or conversion_params ? 'factor'
  ),
  constraint formula_needs_name check (
    conversion_type != 'formula' or conversion_params ? 'formula'
  )
);

create unique index uq_units_global on units(name) where organization_id is null;
create unique index uq_units_org on units(organization_id, name) where organization_id is not null;
create index idx_units_category on units(category);

-- ---------- Observable ----------
-- Es también la Biblioteca de Ejercicios (Fase 6) — no hay tabla separada.
-- Cubre pruebas de atletismo, ejercicios de gimnasio, variables de
-- antropometría/salud: cualquier cosa medible del sistema.
create table observables (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  sport_id uuid not null references sports(id),
  unit_id uuid not null references units(id),
  name text not null,
  is_performance boolean not null default false,
  muscle_group text,
  equipment text,
  description text,
  tags text[] not null default '{}',
  variant_of_id uuid references observables(id),
  created_at timestamptz not null default now()
  -- video_attachment_id / image_attachment_id se agregan en una migración
  -- posterior, cuando exista la tabla `attachments` (dominio transversal,
  -- todavía no construido) — deliberadamente fuera de este ticket.
);

create unique index uq_observables_global on observables(name) where organization_id is null;
create unique index uq_observables_org on observables(organization_id, name) where organization_id is not null;
create index idx_observables_sport on observables(sport_id);
create index idx_observables_variant on observables(variant_of_id);

-- ---------- ContextKey ----------
create table context_keys (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  data_type text not null check (data_type in ('numeric', 'text', 'boolean', 'categorical')),
  unit_id uuid references units(id),
  valid_min numeric,
  valid_max numeric,
  applies_to_sport_id uuid references sports(id),
  required boolean not null default false,
  created_at timestamptz not null default now(),

  constraint range_only_for_numeric check (
    data_type = 'numeric' or (valid_min is null and valid_max is null)
  )
);

create unique index uq_context_keys_global on context_keys(name) where organization_id is null;
create unique index uq_context_keys_org on context_keys(organization_id, name) where organization_id is not null;

-- ---------- Ocultar catálogo global por organización ----------
-- Una organización puede "no usar" un ítem global (ej: un club que no
-- corre 3000m con obstáculos no quiere verlo en sus selectores) sin poder
-- tocar el registro global en sí. Una sola tabla genérica para las cuatro
-- entidades de catálogo, en vez de un flag "hidden" repetido en cada una
-- — evita ensuciar sports/units/observables/context_keys (que además son
-- compartidas por TODAS las organizaciones) con estado que es, por
-- definición, propio de una sola organización.
--
-- Nota de diseño (a futuro, no se construye ahora): si más adelante hace
-- falta personalizar un Observable global por organización (ej: cambiar
-- el nombre visible), esta tabla es el lugar natural para evolucionar
-- —sumando columnas de override (display_name, tags propios, etc.)— en
-- vez de crear una `OrganizationObservable` separada que duplique la
-- definición completa.
create table catalog_visibility_overrides (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references organizations(id) on delete cascade,
  entity_type text not null check (entity_type in ('sport', 'unit', 'observable', 'context_key')),
  entity_id uuid not null,
  hidden boolean not null default true,
  created_at timestamptz not null default now(),

  unique (organization_id, entity_type, entity_id)
);

create index idx_catalog_overrides_org on catalog_visibility_overrides(organization_id, entity_type);
