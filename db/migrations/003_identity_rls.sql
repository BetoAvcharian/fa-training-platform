-- ============================================================
-- 003_identity_rls.sql
-- ============================================================

alter table organizations enable row level security;
alter table people enable row level security;
alter table memberships enable row level security;
alter table audit_logs enable row level security;

-- ---------- Organizations ----------
create policy "select_own_organization" on organizations
  for select using (id = auth_organization_id());

-- El join_code se resuelve SOLO server-side (Server Action, capa de
-- dominio), nunca por una policy abierta a 'anon'. No existe policy de
-- select para 'anon' sobre esta tabla — corrige de raíz la vulnerabilidad
-- de validación client-side marcada en la Fase 10.

-- ---------- People — visibilidad restrictiva por defecto ----------
-- Decisión de producto explícita (revisión Ticket #2): no se asume que
-- todos los coaches de una organización comparten todo el roster. Un
-- coach ve únicamente a SUS atletas. Si una organización necesita
-- visibilidad ampliada, es una configuración explícita futura, no el
-- comportamiento base.

create policy "select_own_person" on people
  for select using (auth_user_id = auth.uid());

create policy "manager_select_org_people" on people
  for select using (
    id in (select person_id from memberships where organization_id = auth_organization_id())
    and auth_role() = 'manager'
  );

create policy "coach_select_own_athletes_person" on people
  for select using (
    id in (
      select person_id from memberships
      where auth_coach_owns_athlete(id)
    )
  );
-- Explícitamente NO existe policy que le dé a un coach visibilidad de
-- toda la organización — solo de sus propios atletas.

-- ---------- Memberships ----------
-- Visibilidad a nivel organización (decisión confirmada): memberships no
-- contiene información personal (eso vive en `people`, con permisos
-- estrictos arriba) — es estructura organizativa (rol, estado,
-- asignación). Mantenerla legible a nivel org evita forzar joins
-- innecesarios para casos legítimos (contar atletas activos, resolver
-- asignaciones, vistas de gestión).
create policy "org_select_memberships" on memberships
  for select using (organization_id = auth_organization_id());

create policy "manager_manage_memberships" on memberships
  for all using (
    organization_id = auth_organization_id() and auth_role() = 'manager'
  );

create policy "self_select_own_membership" on memberships
  for select using (person_id = (select id from people where auth_user_id = auth.uid()));

-- ---------- Audit logs ----------
create policy "org_select_audit" on audit_logs
  for select using (
    organization_id = auth_organization_id() and auth_role() in ('manager', 'coach')
  );
-- Sin policy de insert para ningún rol de aplicación: la única vía de
-- escritura es service_role, usado exclusivamente dentro de
-- /domains/audit/mutations.ts (logAudit). Si cualquier rol pudiera
-- insertar directo, un audit log dejaría de ser confiable como prueba de
-- qué pasó realmente.
