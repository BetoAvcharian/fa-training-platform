import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from '@/domains/athletes/rules'
import { logAudit } from '@/domains/audit/mutations'
import { getPrimaryValue } from '@/domains/events/rules'

/**
 * Marca una SessionExercise como completada por un atleta. Genera (si no
 * existe todavía) la Observation "planificada" correspondiente a esa
 * línea para ese atleta, y SIEMPRE genera una Observation "ejecutada"
 * nueva, con fulfills_observation_id apuntando a la planificada.
 *
 * Decisión de diseño: la Observation planificada se crea LAZY (recién
 * acá, cuando alguien la completa), no eager al cargar la línea en el
 * Ticket #4 — evita retrocompletar Observations planificadas para
 * atletas que nunca llegan a ejecutar esa sesión (ej: una plantilla que
 * se guarda y no se asigna nunca). El costo es una consulta extra acá
 * para chequear si ya existe; el beneficio es no generar filas
 * planificadas de sesiones que nunca se van a ejecutar.
 */
export async function completeSessionLine(
  input: {
    sessionExerciseId: string
    athleteMembershipId: string
    actualValue?: number
    notes?: string
  },
  client?: AppSupabaseClient
) {
  const supabase = client ?? (await createServerClient())

  const { data: line, error: lineError } = await supabase
    .from('session_exercises')
    .select('event_id, observable_id, is_structured, weight_kg, time_seconds, distance_meters')
    .eq('id', input.sessionExerciseId)
    .single()

  if (lineError || !line) {
    throw new DomainError('NOT_FOUND', 'Línea de sesión no encontrada')
  }
  if (!line.is_structured || !line.observable_id) {
    throw new DomainError(
      'VALIDATION',
      'Esta línea todavía no está estructurada (el sistema no pudo interpretarla) — hay que completarla antes de poder marcarla como hecha'
    )
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('organization_id, date')
    .eq('id', line.event_id)
    .single()

  if (eventError || !event) {
    throw new DomainError('NOT_FOUND', 'Event no encontrado')
  }
  if (!event.date) {
    throw new DomainError('VALIDATION', 'El Event no tiene fecha (¿es una plantilla?) — no se puede completar')
  }

  const actor = await requireRole(event.organization_id, ['athlete', 'coach', 'manager'], supabase)
  if (actor.role === 'athlete' && actor.id !== input.athleteMembershipId) {
    throw new DomainError('PERMISSION', 'Un atleta solo puede completar su propia sesión')
  }

  const prescribedValue = getPrimaryValue({
    weightKg: line.weight_kg,
    timeSeconds: line.time_seconds,
    distanceMeters: line.distance_meters,
  })
  if (prescribedValue === null) {
    throw new DomainError('VALIDATION', 'La línea no tiene un valor numérico prescripto para completar')
  }

  // ¿Ya existe la Observation planificada para esta línea+atleta? La
  // identificamos por (event_id, athlete, observable) — no hay una FK
  // directa de SessionExercise a Observation, a propósito (SessionExercise
  // puede compartirse entre varios atletas vía EventAssignment; la
  // Observation planificada es siempre individual).
  const { data: existingPlanned } = await supabase
    .from('observations')
    .select('id')
    .eq('event_id', line.event_id)
    .eq('athlete_membership_id', input.athleteMembershipId)
    .eq('observable_id', line.observable_id)
    .eq('state', 'planificado')
    .is('superseded_by', null)
    .maybeSingle()

  let plannedId = existingPlanned?.id as string | undefined

  if (!plannedId) {
    const { data: newPlanned, error: plannedError } = await supabase.rpc('create_observation_with_context', {
      p_organization_id: event.organization_id,
      p_athlete_membership_id: input.athleteMembershipId,
      p_observable_id: line.observable_id,
      p_value: prescribedValue,
      p_date: event.date,
      p_source_type: 'entrenamiento',
      p_created_by_membership_id: actor.id,
      p_event_id: line.event_id,
      p_state: 'planificado',
    })
    if (plannedError || !newPlanned) {
      throw new DomainError('CONFLICT', plannedError?.message ?? 'No se pudo generar la Observation planificada')
    }
    plannedId = newPlanned as string
  }

  const { data: executedId, error: executedError } = await supabase.rpc('create_observation_with_context', {
    p_organization_id: event.organization_id,
    p_athlete_membership_id: input.athleteMembershipId,
    p_observable_id: line.observable_id,
    p_value: input.actualValue ?? prescribedValue,
    p_date: event.date,
    p_source_type: 'entrenamiento',
    p_created_by_membership_id: actor.id,
    p_event_id: line.event_id,
    p_state: 'ejecutado',
    p_fulfills_observation_id: plannedId,
    p_notes: input.notes ?? null,
  })

  if (executedError || !executedId) {
    throw new DomainError('CONFLICT', executedError?.message ?? 'No se pudo registrar la ejecución')
  }

  await logAudit({
    organizationId: event.organization_id,
    actorMembershipId: actor.id,
    action: 'observation.create',
    entityType: 'observation',
    entityId: executedId,
    metadata: { sessionExerciseId: input.sessionExerciseId, fulfills: plannedId },
  })

  return { plannedId, executedId: executedId as string }
}
