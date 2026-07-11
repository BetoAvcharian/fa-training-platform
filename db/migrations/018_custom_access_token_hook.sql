-- ============================================================
-- 018_custom_access_token_hook.sql
--
-- ⚠️ PASO MANUAL OBLIGATORIO, no automatizable desde una migración:
-- Supabase Dashboard → Authentication → Hooks → "Customize Access Token
-- (JWT) Claims" → seleccionar custom_access_token_hook → guardar.
-- Sin este paso, la función existe pero Supabase nunca la llama, y el
-- JWT nunca lleva organization_id/membership_id/membership_role — todas
-- las políticas de RLS que dependen de auth_organization_id()/auth_role()
-- verían siempre null.
-- ============================================================

create or replace function custom_access_token_hook(event jsonb) returns jsonb as $$
declare
  claims jsonb;
  v_membership record;
begin
  select m.id, m.organization_id, m.role
  into v_membership
  from public.memberships m
  join public.people p on p.id = m.person_id
  where p.auth_user_id = (event->>'user_id')::uuid
  and m.status = 'activo'
  limit 1;

  claims := event->'claims';

  if v_membership.id is not null then
    claims := jsonb_set(claims, '{membership_id}', to_jsonb(v_membership.id::text));
    claims := jsonb_set(claims, '{organization_id}', to_jsonb(v_membership.organization_id::text));
    claims := jsonb_set(claims, '{membership_role}', to_jsonb(v_membership.role::text));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$ language plpgsql stable security definer set search_path = '';

grant execute on function custom_access_token_hook to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant select on public.memberships, public.people to supabase_auth_admin;
