-- ============================================================
-- 006_catalog_seed.sql
-- Catálogo global mínimo — organization_id = null en todo este archivo.
-- Se ejecuta una sola vez, vía migración (equivalente a service_role),
-- nunca desde la aplicación.
-- ============================================================

-- ---------- Sports ----------
insert into sports (organization_id, name) values
  (null, 'Atletismo'),
  (null, 'Fuerza');

-- ---------- Units — unidades base primero (base_unit_id = si misma) ----------
insert into units (organization_id, name, symbol, category, conversion_type, conversion_params) values
  (null, 'Segundo', 's', 'tiempo', 'lineal', '{"factor": 1}'),
  (null, 'Metro', 'm', 'distancia', 'lineal', '{"factor": 1}'),
  (null, 'Kilogramo', 'kg', 'masa', 'lineal', '{"factor": 1}'),
  (null, 'Metro por segundo', 'm/s', 'velocidad', 'lineal', '{"factor": 1}'),
  (null, 'Punto', 'pt', 'escala', 'lineal', '{"factor": 1}'),
  (null, 'Celsius', '°C', 'temperatura', 'lineal', '{"factor": 1}');

-- base_unit_id de cada unidad base apunta a sí misma (evita null ambiguo
-- entre "no tiene conversión" y "es la base de su categoría")
update units set base_unit_id = id where organization_id is null and conversion_params = '{"factor": 1}';

-- ---------- Units — no base, con conversión ----------
insert into units (organization_id, name, symbol, category, base_unit_id, conversion_type, conversion_params)
select null, 'Minuto', 'min', 'tiempo', id, 'lineal', '{"factor": 60}' from units where name = 'Segundo' and organization_id is null;

insert into units (organization_id, name, symbol, category, base_unit_id, conversion_type, conversion_params)
select null, 'Kilómetro', 'km', 'distancia', id, 'lineal', '{"factor": 1000}' from units where name = 'Metro' and organization_id is null;

insert into units (organization_id, name, symbol, category, base_unit_id, conversion_type, conversion_params)
select null, 'Libra', 'lb', 'masa', id, 'lineal', '{"factor": 0.45359237}' from units where name = 'Kilogramo' and organization_id is null;

-- Ejemplo real de conversión NO lineal (Fase 5): Fahrenheit necesita una
-- fórmula con offset, no un factor multiplicativo. 'celsius_to_fahrenheit'
-- es el nombre registrado en domains/catalog/rules.ts.
insert into units (organization_id, name, symbol, category, base_unit_id, conversion_type, conversion_params)
select null, 'Fahrenheit', '°F', 'temperatura', id, 'formula', '{"formula": "fahrenheit_to_celsius"}' from units where name = 'Celsius' and organization_id is null;

-- ---------- Observables — Atletismo (subset del catálogo real de la V1) ----------
insert into observables (organization_id, sport_id, unit_id, name, is_performance, tags)
select null, s.id, u.id, o.name, true, array['pista']::text[]
from (values ('100m'), ('200m'), ('400m'), ('800m'), ('1500m')) as o(name)
cross join (select id from sports where name = 'Atletismo' and organization_id is null) s
cross join (select id from units where name = 'Segundo' and organization_id is null) u;

insert into observables (organization_id, sport_id, unit_id, name, is_performance, tags)
select null, s.id, u.id, o.name, true, array['campo']::text[]
from (values ('Salto en largo'), ('Lanzamiento de bala')) as o(name)
cross join (select id from sports where name = 'Atletismo' and organization_id is null) s
cross join (select id from units where name = 'Metro' and organization_id is null) u;

-- ---------- Observables — Fuerza ----------
insert into observables (organization_id, sport_id, unit_id, name, is_performance, muscle_group, tags)
select null, s.id, u.id, o.name, true, o.muscle_group, array['fuerza']::text[]
from (values ('Sentadilla', 'pierna'), ('Peso muerto', 'full body')) as o(name, muscle_group)
cross join (select id from sports where name = 'Fuerza' and organization_id is null) s
cross join (select id from units where name = 'Kilogramo' and organization_id is null) u;

-- ---------- Context keys ----------
-- Viento: aplica solo a pruebas de atletismo, rango real de la regla
-- IAAF/World Athletics (>2.0 m/s descalifica para récord en pruebas
-- sensibles — la lógica de descalificación vive en el dominio de
-- Observation/Record, no acá; esto solo define el rango válido de carga).
insert into context_keys (organization_id, name, data_type, unit_id, valid_min, valid_max, applies_to_sport_id, required)
select null, 'viento', 'numeric', u.id, -10, 10, s.id, false
from (select id from units where name = 'Metro por segundo' and organization_id is null) u
cross join (select id from sports where name = 'Atletismo' and organization_id is null) s;
