-- ============================================================
-- 017_wellness_observables.sql
--
-- Energía/Fatiga/Molestia del check-in diario son Observables más
-- (is_performance=false, categoría 'escala') — mismo mecanismo que
-- cualquier otra medición, ninguna tabla nueva. Van bajo un Sport
-- "General" porque no pertenecen a un deporte puntual (a diferencia de
-- "100m" bajo Atletismo) — corregido sobre la marcha: el primer intento
-- las había puesto bajo Atletismo por default, semánticamente incorrecto.
-- ============================================================

insert into sports (organization_id, name) values (null, 'General');

insert into observables (organization_id, sport_id, unit_id, name, is_performance)
select null, s.id, u.id, o.name, false
from (values ('Energía'), ('Fatiga'), ('Molestia')) as o(name)
cross join (select id from sports where name = 'General' and organization_id is null) s
cross join (select id from units where name = 'Punto' and organization_id is null) u;
