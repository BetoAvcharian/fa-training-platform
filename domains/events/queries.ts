import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import type { Event, EventAssignment, SessionBlock, SessionExercise } from './types'

export async function getEventsForRange(
  organizationId: string,
  from: string,
  to: string,
  client?: AppSupabaseClient
): Promise<Event[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('events')
    .select('id, organization_id, type, title, date, is_template, created_by_membership_id')
    .eq('organization_id', organizationId)
    .eq('is_template', false)
    .gte('date', from)
    .lte('date', to)
    .order('date')

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map(mapEvent)
}

/** Historial de entrenamientos/competencias de un atleta puntual (para su pestaña "Entrenamientos"). */
export async function getEventsForAthlete(
  athleteMembershipId: string,
  limit = 30,
  client?: AppSupabaseClient
): Promise<Event[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('event_assignments')
    .select('events!inner(id, organization_id, type, title, date, is_template, created_by_membership_id)')
    .eq('assignee_type', 'person')
    .eq('assignee_id', athleteMembershipId)
    .eq('events.is_template', false)
    .order('date', { referencedTable: 'events', ascending: false })
    .limit(limit)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => mapEvent(row.events))
}

export async function getEventAssignments(eventId: string, client?: AppSupabaseClient): Promise<EventAssignment[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('event_assignments')
    .select('id, event_id, assignee_type, assignee_id')
    .eq('event_id', eventId)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    assigneeType: row.assignee_type,
    assigneeId: row.assignee_id,
  }))
}

export async function getSessionBlocks(eventId: string, client?: AppSupabaseClient): Promise<SessionBlock[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('session_blocks')
    .select('id, event_id, title, order_index')
    .eq('event_id', eventId)
    .order('order_index')

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    orderIndex: row.order_index,
  }))
}

export async function getSessionExercises(eventId: string, client?: AppSupabaseClient): Promise<SessionExercise[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('session_exercises')
    .select(
      'id, event_id, session_block_id, order_index, raw_text, is_structured, observable_id, sets, reps, weight_kg, distance_meters, time_seconds, rest_seconds, replaces_id'
    )
    .eq('event_id', eventId)
    .order('order_index')

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map(mapSessionExercise)
}

/** sessionExerciseId -> lista de event_assignment_id a los que aplica esa excepción. */
export async function getExceptionMap(
  eventId: string,
  client?: AppSupabaseClient
): Promise<Map<string, string[]>> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('session_exercise_assignments')
    .select('session_exercise_id, event_assignment_id, session_exercises!inner(event_id)')
    .eq('session_exercises.event_id', eventId)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  const map = new Map<string, string[]>()
  for (const row of data ?? []) {
    const list = map.get(row.session_exercise_id) ?? []
    list.push(row.event_assignment_id)
    map.set(row.session_exercise_id, list)
  }
  return map
}

function mapEvent(row: any): Event {
  return {
    id: row.id,
    organizationId: row.organization_id,
    type: row.type,
    title: row.title,
    date: row.date,
    isTemplate: row.is_template,
    createdByMembershipId: row.created_by_membership_id,
  }
}

function mapSessionExercise(row: any): SessionExercise {
  return {
    id: row.id,
    eventId: row.event_id,
    sessionBlockId: row.session_block_id,
    orderIndex: row.order_index,
    rawText: row.raw_text,
    isStructured: row.is_structured,
    observableId: row.observable_id,
    sets: row.sets,
    reps: row.reps,
    weightKg: row.weight_kg,
    distanceMeters: row.distance_meters,
    timeSeconds: row.time_seconds,
    restSeconds: row.rest_seconds,
    replacesId: row.replaces_id,
  }
}
