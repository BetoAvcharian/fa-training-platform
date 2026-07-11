-- ============================================================
-- 016_observation_rpc.sql
--
-- supabase-js hace un request HTTP por cada .insert() — dos inserts
-- separados (Observation + su contexto) NO comparten transacción. El
-- constraint trigger diferido de personal_records (013) necesita que
-- ambos pasen en la MISMA transacción para poder ver el viento antes de
-- evaluar el récord. Se resuelve con una función Postgres que hace las
-- dos inserciones adentro de una sola invocación — mismo patrón que ya
-- habíamos anticipado en la Fase 11 para mutations multi-tabla atómicas.
-- Validado end-to-end contra datos reales antes de escribir el dominio
-- TypeScript que lo llama.
-- ============================================================

create or replace function create_observation_with_context(
  p_organization_id uuid,
  p_athlete_membership_id uuid,
  p_observable_id uuid,
  p_value numeric,
  p_date date,
  p_source_type observation_source_type,
  p_created_by_membership_id uuid,
  p_event_id uuid default null,
  p_state observation_state default 'ejecutado',
  p_fulfills_observation_id uuid default null,
  p_notes text default null,
  p_context jsonb default '{}'::jsonb
) returns uuid as $$
declare
  v_observation_id uuid;
  v_key text;
  v_value jsonb;
  v_data_type text;
begin
  insert into public.observations (
    organization_id, athlete_membership_id, observable_id, value, date, source_type,
    event_id, state, fulfills_observation_id, notes, created_by_membership_id
  ) values (
    p_organization_id, p_athlete_membership_id, p_observable_id, p_value, p_date, p_source_type,
    p_event_id, p_state, p_fulfills_observation_id, p_notes, p_created_by_membership_id
  ) returning id into v_observation_id;

  for v_key, v_value in select * from jsonb_each(p_context) loop
    select data_type into v_data_type from public.context_keys where id = v_key::uuid;

    if v_data_type = 'numeric' then
      insert into public.observation_context_values (observation_id, context_key_id, value_numeric)
      values (v_observation_id, v_key::uuid, (v_value#>>'{}')::numeric);
    elsif v_data_type = 'boolean' then
      insert into public.observation_context_values (observation_id, context_key_id, value_boolean)
      values (v_observation_id, v_key::uuid, (v_value#>>'{}')::boolean);
    else
      insert into public.observation_context_values (observation_id, context_key_id, value_text)
      values (v_observation_id, v_key::uuid, v_value#>>'{}');
    end if;
  end loop;

  return v_observation_id;
end;
$$ language plpgsql security definer set search_path = '';
