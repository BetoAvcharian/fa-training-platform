-- ============================================================
-- 005_catalog_rls.sql
--
-- Regla central de todo este archivo, repetida en cada tabla:
-- SELECT es abierto (global + lo propio de la organización).
-- INSERT/UPDATE/DELETE están acotados a `organization_id = auth_organization_id()`
-- — como esa condición NUNCA es verdadera cuando organization_id es null
-- (auth_organization_id() nunca devuelve null para un usuario válido),
-- esto hace que los registros globales sean estructuralmente imposibles
-- de tocar por cualquier rol de aplicación. No hay ninguna policy que
-- otorgue escritura sobre organization_id is null — ni siquiera para
-- manager. Esa fila solo la toca service_role (seed), fuera de RLS.
-- ============================================================

alter table sports enable row level security;
alter table units enable row level security;
alter table observables enable row level security;
alter table context_keys enable row level security;
alter table catalog_visibility_overrides enable row level security;

-- ---------- Sports ----------
create policy "select_visible_sports" on sports
  for select using (organization_id is null or organization_id = auth_organization_id());

create policy "staff_insert_org_sports" on sports
  for insert with check (
    organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
  );

create policy "staff_update_org_sports" on sports
  for update using (
    organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
  );
-- Sin policy de delete: borrar un Sport con Observables dependientes es
-- una operación delicada que este ticket no resuelve — se hace vía
-- service_role si hace falta, no expuesta a la aplicación todavía.

-- ---------- Units ----------
create policy "select_visible_units" on units
  for select using (organization_id is null or organization_id = auth_organization_id());

create policy "staff_insert_org_units" on units
  for insert with check (
    organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
  );

create policy "staff_update_org_units" on units
  for update using (
    organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
  );

-- ---------- Observables ----------
create policy "select_visible_observables" on observables
  for select using (organization_id is null or organization_id = auth_organization_id());

create policy "staff_insert_org_observables" on observables
  for insert with check (
    organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
  );

create policy "staff_update_org_observables" on observables
  for update using (
    organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
  );
-- Atleta: solo lectura (Fase 6/8.7) — cubierto por select_visible_observables,
-- que no distingue rol; no existe policy de insert/update para 'athlete'.

-- ---------- Context keys ----------
create policy "select_visible_context_keys" on context_keys
  for select using (organization_id is null or organization_id = auth_organization_id());

create policy "staff_insert_org_context_keys" on context_keys
  for insert with check (
    organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
  );

-- ---------- Catalog visibility overrides ----------
-- Ocultar un ítem global es una acción de gestión de catálogo (Fase 8.7:
-- "avanzado", visible pero no promovido) — restringida a manager.
create policy "org_select_own_overrides" on catalog_visibility_overrides
  for select using (organization_id = auth_organization_id());

create policy "manager_manage_own_overrides" on catalog_visibility_overrides
  for all using (
    organization_id = auth_organization_id() and auth_role() = 'manager'
  );
