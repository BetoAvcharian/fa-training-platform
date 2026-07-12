import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import type { Observation, PersonalRecord } from './types'

export async function getRecords(
  athleteMembershipId: string,
  client?: AppSupabaseClient
): Promise<PersonalRecord[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('personal_records')
    .select('id, athlete_membership_id, observable_id, record_type, best_observation_id, value, achieved_date')
    .eq('athlete_membership_id', athleteMembershipId)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    athleteMembershipId: row.athlete_membership_id,
    observableId: row.observable_id,
    recordType: row.record_type,
    bestObservationId: row.best_observation_id,
    value: row.value,
    achievedDate: row.achieved_date,
  }))
}

/** Solo Observations VIGENTES (superseded_by is null) — para progresión, rankings, comparación. */
export async function getVigentObservations(
  athleteMembershipId: string,
  filters: { observableId?: string; sourceType?: string; from?: string; to?: string } = {},
  client?: AppSupabaseClient
): Promise<Observation[]> {
  const supabase = client ?? (await createServerClient())

  let query = supabase
    .from('observations')
    .select(
      'id, organization_id, athlete_membership_id, observable_id, value, date, source_type, event_id, assessment_id, import_id, validation_status, state, fulfills_observation_id, superseded_by, notes, created_by_membership_id'
    )
    .eq('athlete_membership_id', athleteMembershipId)
    .is('superseded_by', null)
    .order('date')

  if (filters.observableId) query = query.eq('observable_id', filters.observableId)
  if (filters.sourceType) query = query.eq('source_type', filters.sourceType)
  if (filters.from) query = query.gte('date', filters.from)
  if (filters.to) query = query.lte('date', filters.to)

  const { data, error } = await query
  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map(mapObservation)
}

/**
 * Observaciones ejecutadas de un Event puntual, para el modo "Ver" del
 * calendario (comparar planificado vs. real). Clave de lookup:
 * athlete_membership_id + observable_id, porque no hay FK directa de
 * SessionExercise a Observation (spec 3.3: una línea puede compartirse
 * entre varios atletas vía EventAssignment).
 */
export async function getObservationsForEvent(
  eventId: string,
  client?: AppSupabaseClient
): Promise<Array<{ athleteMembershipId: string; observableId: string; value: number; state: string }>> {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from('observations')
    .select('athlete_membership_id, observable_id, value, state')
    .eq('event_id', eventId)
    .is('superseded_by', null)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row) => ({
    athleteMembershipId: row.athlete_membership_id,
    observableId: row.observable_id,
    value: row.value,
    state: row.state,
  }))
}

export async function getObservationContext(
  observationId: string,
  client?: AppSupabaseClient
): Promise<Record<string, number | string | boolean>> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('observation_context_values')
    .select('context_key_id, value_numeric, value_text, value_boolean, context_keys(name)')
    .eq('observation_id', observationId)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  const result: Record<string, number | string | boolean> = {}
  for (const row of data ?? []) {
    const name = (row as any).context_keys?.name ?? row.context_key_id
    const value = row.value_numeric ?? row.value_text ?? row.value_boolean
    if (value !== null && value !== undefined) result[name] = value
  }
  return result
}

function mapObservation(row: any): Observation {
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

/**
 * Serie temporal de un Observable para un atleta — la base de datos
 * detrás del gráfico de Progresión (Fase 8.4). Solo vigentes: una
 * corrección no debería aparecer dos veces en la curva.
 */
export async function getProgressionSeries(
  athleteMembershipId: string,
  observableId: string,
  filters: { from?: string; to?: string } = {},
  client?: AppSupabaseClient
): Promise<Array<{ date: string; value: number }>> {
  const observations = await getVigentObservations(athleteMembershipId, { observableId, ...filters }, client)
  return observations.filter((o) => o.state === 'ejecutado').map((o) => ({ date: o.date, value: o.value }))
}

/**
 * Tabla "Todos los resultados" del wireframe de Rendimiento: a
 * diferencia de getVigentObservations, esta SÍ incluye las corregidas —
 * la columna "Estado" (vigente/reemplazada) es lo que las distingue, no
 * su ausencia de la lista. La cadena de superseded_by queda visible al
 * usuario, no oculta en la base (Fase 8.4, decisión explícita).
 */
export async function getAllObservationsWithStatus(
  athleteMembershipId: string,
  filters: { observableId?: string; sourceType?: string; from?: string; to?: string } = {},
  client?: AppSupabaseClient
): Promise<Array<Observation & { status: 'vigente' | 'reemplazada' }>> {
  const supabase = client ?? (await createServerClient())

  let query = supabase
    .from('observations')
    .select(
      'id, organization_id, athlete_membership_id, observable_id, value, date, source_type, event_id, assessment_id, import_id, validation_status, state, fulfills_observation_id, superseded_by, notes, created_by_membership_id'
    )
    .eq('athlete_membership_id', athleteMembershipId)
    .order('date', { ascending: false })

  if (filters.observableId) query = query.eq('observable_id', filters.observableId)
  if (filters.sourceType) query = query.eq('source_type', filters.sourceType)
  if (filters.from) query = query.gte('date', filters.from)
  if (filters.to) query = query.lte('date', filters.to)

  const { data, error } = await query
  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row) => ({
    ...mapObservation(row),
    status: row.superseded_by === null ? ('vigente' as const) : ('reemplazada' as const),
  }))
}
