-- ============================================================
-- 011_observables_direction_and_wind.sql
-- ============================================================

-- higher_is_better: false para tiempo (menos es mejor), true para
-- distancia/peso (más es mejor). No se infiere de la categoría de Unit
-- (una plancha de fuerza también se mide en segundos y ahí "más" es
-- mejor) — es un atributo explícito del Observable, no del Unit.
alter table observables add column if not exists higher_is_better boolean not null default false;
alter table observables add column if not exists wind_sensitive boolean not null default false;

update observables set higher_is_better = true
where name in ('Salto en largo', 'Lanzamiento de bala', 'Sentadilla', 'Peso muerto')
and organization_id is null;

update observables set wind_sensitive = true
where name in ('100m', '200m', 'Salto en largo')
and organization_id is null;
