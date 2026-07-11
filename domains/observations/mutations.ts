import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireAuthenticated } from '@/domains/athletes/rules'
import { logAudit } from '@/domains/audit/mutations'
import { findBestObservation, isWindDisqualifying, recordTypeForSource } from './rules'
import type { CreateObservationInput, CorrectObservationInput, Observation } from './types'

async function assertCanWriteForAthlete(
  supabase: AppSupabaseClient,
  organizationId: string,
  athleteMembershipId: string
) {
  const actor = await requireAuthenticated(organizationId, supabase)

  if (actor.role === 'athlete' && actor.id !== athleteMembershipId) {
    throw new DomainError('PERMISSION', 'Un atleta solo puede cargar sus propios datos')
  }
  if (actor.role === 'coach') {
    const { data: athlete } = await supabase
      .from('memberships')
      .select('coach_membership_id')
      .eq('id', athleteMembershipId)
      .single()
    if (athlete?.coach_membership_id !== actor.id) {
      throw new DomainError('PERMISSION', 'Este atleta no es tuyo')
    }
  }
  return actor
}

/**
 * Crea una Observation, con contexto opcional (viento, etc.) — usa el
 * RPC create_observation_with_context para que ambas escrituras pasen en
 * la MISMA transacción, requisito del constraint trigger diferido de
 * personal_records (ver 013/016). NUNCA se hace vía dos .insert()
 * separados — se rompería el cálculo de récord en pruebas con viento.
 */
export async function createObservation(input: CreateObservationInput, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())
  const actor = await assertCanWriteForAthlete(supabase, input.organizationId, input.athleteMembershipId)

  const { data: observationId, error } = await supabase.rpc('create_observation_with_context', {
    p_organization_id: input.organizationId,
    p_athlete_membership_id: input.athleteMembershipId,
    p_observable_id: input.observableId,
    p_value: input.value,
    p_date: input.date,
    p_source_type: input.sourceType,
    p_created_by_membership_id: actor.id,
    p_event_id: input.eventId ?? null,
    p_state: input.state ?? 'ejecutado',
    p_fulfills_observation_id: input.fulfillsObservationId ?? null,
    p_notes: input.notes ?? null,
    p_context: input.context ?? {},
  })

  if (error || !observationId) {
    throw new DomainError('CONFLICT', error?.message ?? 'No se pudo crear la Observation')
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'observation.create',
    entityType: 'observation',
    entityId: observationId,
    metadata: { observableId: input.observableId, sourceType: input.sourceType, value: input.value },
  })

  return { id: observationId as string }
}

/**
 * Corrige una Observation: nunca se edita in-place (Fase 3). Crea una
 * fila nueva y marca la vieja con superseded_by. Si la fila corregida
 * era el récord vigente, recalcula desde cero entre las Observations
 * restantes — el trigger de insert por sí solo NO alcanza acá, porque
 * compara la fila nueva contra el récord actual, pero no sabe que ese
 * "récord actual" puede haber quedado obsoleto por la corrección de su
 * propio origen.
 */
export async function correctObservation(input: CorrectObservationInput, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())

  const { data: old, error: fetchError } = await supabase
    .from('observations')
    .select(
      'organization_id, athlete_membership_id, observable_id, date, source_type, event_id, state, notes, created_by_membership_id'
    )
    .eq('id', input.observationId)
    .single()

  if (fetchError || !old) {
    throw new DomainError('NOT_FOUND', 'Observation no encontrada')
  }

  const actor = await assertCanWriteForAthlete(supabase, old.organization_id, old.athlete_membership_id)

  const { data: newObservationId, error: createError } = await supabase.rpc('create_observation_with_context', {
    p_organization_id: old.organization_id,
    p_athlete_membership_id: old.athlete_membership_id,
    p_observable_id: old.observable_id,
    p_value: input.newValue,
    p_date: old.date,
    p_source_type: old.source_type,
    p_created_by_membership_id: actor.id,
    p_event_id: old.event_id,
    p_state: old.state,
    p_notes: input.reason ?? old.notes,
  })

  if (createError || !newObservationId) {
    throw new DomainError('CONFLICT', createError?.message ?? 'No se pudo crear la corrección')
  }

  const { error: updateError } = await supabase
    .from('observations')
    .update({ superseded_by: newObservationId })
    .eq('id', input.observationId)

  if (updateError) {
    throw new DomainError('CONFLICT', updateError.message)
  }

  await recomputeRecordIfWasBest(
    supabase,
    old.athlete_membership_id,
    old.observable_id,
    recordTypeForSource(old.source_type),
    input.observationId
  )

  await logAudit({
    organizationId: old.organization_id,
    actorMembershipId: actor.id,
    action: 'observation.correct',
    entityType: 'observation',
    entityId: newObservationId,
    beforeState: { observationId: input.observationId },
    afterState: { newValue: input.newValue },
  })

  return { id: newObservationId as string }
}

async function recomputeRecordIfWasBest(
  supabase: AppSupabaseClient,
  athleteMembershipId: string,
  observableId: string,
  recordType: 'oficial' | 'entrenamiento',
  correctedObservationId: string
) {
  const { data: record } = await supabase
    .from('personal_records')
    .select('best_observation_id')
    .eq('athlete_membership_id', athleteMembershipId)
    .eq('observable_id', observableId)
    .eq('record_type', recordType)
    .maybeSingle()

  if (record?.best_observation_id !== correctedObservationId) {
    return // la corrección no afectaba el récord vigente, nada que recalcular
  }

  const { data: observable } = await supabase
    .from('observables')
    .select('higher_is_better, wind_sensitive')
    .eq('id', observableId)
    .single()

  const { data: candidates } = await supabase
    .from('observations')
    .select('id, organization_id, athlete_membership_id, observable_id, value, date, source_type, event_id, assessment_id, import_id, validation_status, state, fulfills_observation_id, superseded_by, notes, created_by_membership_id')
    .eq('athlete_membership_id', athleteMembershipId)
    .eq('observable_id', observableId)
    .is('superseded_by', null)
    .eq('state', 'ejecutado')

  const relevant = (candidates ?? []).filter(
    (c: any) => recordTypeForSource(c.source_type) === recordType
  )

  const withWind = await Promise.all(
    relevant.map(async (c: any) => {
      if (!observable?.wind_sensitive) return { observation: mapRow(c), windValue: null }
      const { data: ctx } = await supabase
        .from('observation_context_values')
        .select('value_numeric, context_keys!inner(name)')
        .eq('observation_id', c.id)
        .eq('context_keys.name', 'viento')
        .maybeSingle()
      return { observation: mapRow(c), windValue: ctx?.value_numeric ?? null }
    })
  )

  const best = findBestObservation(withWind, observable?.higher_is_better ?? false, observable?.wind_sensitive ?? false)

  if (best) {
    await supabase.from('personal_records').update({
      best_observation_id: best.id,
      value: best.value,
      achieved_date: best.date,
      updated_at: new Date().toISOString(),
    }).eq('athlete_membership_id', athleteMembershipId).eq('observable_id', observableId).eq('record_type', recordType)
  } else {
    // no queda ninguna Observation elegible -> el récord deja de existir
    await supabase
      .from('personal_records')
      .delete()
      .eq('athlete_membership_id', athleteMembershipId)
      .eq('observable_id', observableId)
      .eq('record_type', recordType)
  }
}

function mapRow(row: any): Observation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    athleteMembershipId: row.athlete_membership_id,
    observableId: row.observable_id,
    value: row.value,
    date: row.date,
    sourceType: row.source_type,
    eventId: row.event_id,
    assessmentId: row.assessment_id,
    importId: row.import_id,
    validationStatus: row.validation_status,
    state: row.state,
    fulfillsObservationId: row.fulfills_observation_id,
    supersededBy: row.superseded_by,
    notes: row.notes,
    createdByMembershipId: row.created_by_membership_id,
  }
}
