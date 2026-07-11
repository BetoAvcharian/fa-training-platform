-- ============================================================
-- 013_observations_record_trigger.sql
--
-- Viento descalifica el RÉCORD (no la carga) en pruebas sensibles si
-- supera 2.0 m/s a favor — regla real de World Athletics. Si no hay dato
-- de viento cargado para una prueba sensible, NO se descalifica por
-- defecto (permisivo) — simplificación consciente, documentada acá.
-- ============================================================

create or replace function is_wind_disqualifying(p_observation_id uuid) returns boolean as $$
declare
  v_sensitive boolean;
  v_wind numeric;
begin
  select o.wind_sensitive into v_sensitive
  from public.observations obs
  join public.observables o on o.id = obs.observable_id
  where obs.id = p_observation_id;

  if not coalesce(v_sensitive, false) then
    return false;
  end if;

  select ocv.value_numeric into v_wind
  from public.observation_context_values ocv
  join public.context_keys ck on ck.id = ocv.context_key_id
  where ocv.observation_id = p_observation_id and ck.name = 'viento';

  if v_wind is null then
    return false;
  end if;

  return v_wind > 2.0;
end;
$$ language plpgsql stable security definer set search_path = '';

create or replace function update_personal_record() returns trigger as $$
declare
  v_is_performance boolean;
  v_higher_is_better boolean;
  v_record_type text;
  v_current record;
  v_better boolean;
begin
  if new.state != 'ejecutado' or new.superseded_by is not null then
    return new;
  end if;

  select is_performance, higher_is_better into v_is_performance, v_higher_is_better
  from public.observables where id = new.observable_id;

  if not coalesce(v_is_performance, false) then
    return new;
  end if;

  if public.is_wind_disqualifying(new.id) then
    return new;
  end if;

  v_record_type := case when new.source_type = 'competencia' then 'oficial' else 'entrenamiento' end;

  select * into v_current from public.personal_records
  where athlete_membership_id = new.athlete_membership_id
  and observable_id = new.observable_id
  and record_type = v_record_type;

  if not found then
    v_better := true;
  elsif v_higher_is_better then
    v_better := new.value > v_current.value;
  else
    v_better := new.value < v_current.value;
  end if;

  if v_better then
    insert into public.personal_records (athlete_membership_id, observable_id, record_type, best_observation_id, value, achieved_date)
    values (new.athlete_membership_id, new.observable_id, v_record_type, new.id, new.value, new.date)
    on conflict (athlete_membership_id, observable_id, record_type) do update
    set best_observation_id = excluded.best_observation_id,
        value = excluded.value,
        achieved_date = excluded.achieved_date,
        updated_at = now();
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- constraint trigger + deferrable initially deferred: se ejecuta al hacer
-- COMMIT de la transacción, no apenas se inserta la fila. Necesario para
-- que, dentro de la MISMA transacción, el valor de contexto (viento) ya
-- esté insertado en observation_context_values antes de que el trigger
-- evalúe si corresponde récord — de otro modo, el trigger correría antes
-- de que el contexto exista y nunca vería el viento cargado.
-- (Encontrado y corregido durante la validación real de este ticket.)
create constraint trigger trg_update_personal_record
  after insert on observations
  deferrable initially deferred
  for each row execute function update_personal_record();
