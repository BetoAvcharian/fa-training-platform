import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from '@/domains/athletes/rules'
import { logAudit } from '@/domains/audit/mutations'
import { parseLine } from './rules'
import type { CreateEventInput, AddSessionLineInput } from './types'

export async function createEvent(input: CreateEventInput, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      organization_id: input.organizationId,
      type: input.type,
      title: input.title,
      date: input.date,
      created_by_membership_id: actor.id,
    })
    .select('id')
    .single()

  if (error || !event) {
    throw new DomainError('CONFLICT', error?.message ?? 'No se pudo crear el Event')
  }

  if (input.assignments.length > 0) {
    const { error: assignError } = await supabase.from('event_assignments').insert(
      input.assignments.map((a) => ({
        event_id: event.id,
        assignee_type: a.type,
        assignee_id: a.id,
      }))
    )
    if (assignError) {
      throw new DomainError('CONFLICT', assignError.message)
    }
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'event.create',
    entityType: 'event',
    entityId: event.id,
    metadata: { type: input.type, date: input.date, assignmentCount: input.assignments.length },
  })

  return event
}

/**
 * Agrega una línea de sesión, corriendo SmartLine sobre el texto. Nunca
 * falla por no poder interpretar la línea — la guarda igual, marcada
 * `is_structured: false` (2.19).
 *
 * Si `exceptionForAssignmentIds` viene con valores, la línea es una
 * excepción: se vincula solo a esos EventAssignment vía
 * SessionExerciseAssignment, y requiere `replacesId` apuntando a la línea
 * genérica que reemplaza para esos destinatarios.
 */
export async function addSessionLine(input: AddSessionLineInput, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('organization_id')
    .eq('id', input.eventId)
    .single()

  if (eventError || !event) {
    throw new DomainError('NOT_FOUND', 'Event no encontrado')
  }

  const actor = await requireRole(event.organization_id, ['manager', 'coach'], supabase)

  const isException = (input.exceptionForAssignmentIds?.length ?? 0) > 0
  if (isException && !input.replacesId) {
    throw new DomainError('VALIDATION', 'Una excepción necesita indicar qué línea genérica reemplaza', 'replacesId')
  }

  const parsed = parseLine(input.rawText, input.sportName)

  let observableId: string | null = null
  if (parsed.isStructured && parsed.observableName) {
    // Búsqueda case-insensitive contra el catálogo visible para esta
    // organización (global + propio) — si no encuentra coincidencia, la
    // línea sigue guardándose igual (is_structured no depende de esto),
    // solo queda sin vincular al catálogo hasta que alguien la complete.
    const { data: match } = await supabase
      .from('observables')
      .select('id')
      .or(`organization_id.is.null,organization_id.eq.${event.organization_id}`)
      .ilike('name', parsed.observableName)
      .limit(1)
      .maybeSingle()
    observableId = match?.id ?? null
  }

  const { data: lastOrder } = await supabase
    .from('session_exercises')
    .select('order_index')
    .eq('event_id', input.eventId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (lastOrder?.order_index ?? -1) + 1

  const { data: line, error: lineError } = await supabase
    .from('session_exercises')
    .insert({
      event_id: input.eventId,
      session_block_id: input.sessionBlockId ?? null,
      order_index: nextOrder,
      raw_text: input.rawText,
      is_structured: parsed.isStructured,
      observable_id: observableId,
      sets: parsed.sets ?? null,
      reps: parsed.reps ?? null,
      weight_kg: parsed.weightKg ?? null,
      distance_meters: parsed.distanceMeters ?? null,
      time_seconds: parsed.timeSeconds ?? null,
      rest_seconds: parsed.restSeconds ?? null,
      replaces_id: isException ? input.replacesId : null,
    })
    .select('id')
    .single()

  if (lineError || !line) {
    throw new DomainError('CONFLICT', lineError?.message ?? 'No se pudo guardar la línea')
  }

  if (isException) {
    const { error: exError } = await supabase.from('session_exercise_assignments').insert(
      input.exceptionForAssignmentIds!.map((assignmentId) => ({
        session_exercise_id: line.id,
        event_assignment_id: assignmentId,
      }))
    )
    if (exError) {
      throw new DomainError('CONFLICT', exError.message)
    }
  }

  await logAudit({
    organizationId: event.organization_id,
    actorMembershipId: actor.id,
    action: isException ? 'session_exercise.exception_create' : 'session_exercise.create',
    entityType: 'session_exercise',
    entityId: line.id,
    metadata: { rawText: input.rawText, isStructured: parsed.isStructured },
  })

  return { id: line.id, parsed }
}

/**
 * Clona un Event completo (plantilla, semana anterior, u otro atleta) —
 * mecanismo único que resuelve los 4 casos de "reutilización" definidos
 * en la Fase 4, sin construir features separadas para cada uno.
 */
export async function cloneEvent(
  input: { sourceEventId: string; newDate: string; newAssignments?: Array<{ type: 'person' | 'group'; id: string }> },
  client?: AppSupabaseClient
) {
  const supabase = client ?? (await createServerClient())

  const { data: source, error: sourceError } = await supabase
    .from('events')
    .select('organization_id, type, title, created_by_membership_id')
    .eq('id', input.sourceEventId)
    .single()

  if (sourceError || !source) {
    throw new DomainError('NOT_FOUND', 'Event de origen no encontrado')
  }

  const actor = await requireRole(source.organization_id, ['manager', 'coach'], supabase)

  const { data: newEvent, error: createError } = await supabase
    .from('events')
    .insert({
      organization_id: source.organization_id,
      type: source.type,
      title: source.title,
      date: input.newDate,
      created_by_membership_id: actor.id,
    })
    .select('id')
    .single()

  if (createError || !newEvent) {
    throw new DomainError('CONFLICT', createError?.message ?? 'No se pudo clonar el Event')
  }

  // Asignaciones: las nuevas si vienen, si no, las mismas del origen.
  const { data: sourceAssignments } = await supabase
    .from('event_assignments')
    .select('assignee_type, assignee_id')
    .eq('event_id', input.sourceEventId)

  const assignmentsToCreate = input.newAssignments ?? sourceAssignments ?? []
  if (assignmentsToCreate.length > 0) {
    await supabase.from('event_assignments').insert(
      assignmentsToCreate.map((a: any) => ({
        event_id: newEvent.id,
        assignee_type: a.type ?? a.assignee_type,
        assignee_id: a.id ?? a.assignee_id,
      }))
    )
  }

  // Clona bloques y líneas genéricas (NO clona excepciones — son
  // específicas de la asignación de origen, no tendrían sentido en el
  // Event nuevo sin volver a decidir a quién aplican).
  const { data: sourceBlocks } = await supabase
    .from('session_blocks')
    .select('id, title, order_index')
    .eq('event_id', input.sourceEventId)
    .order('order_index')

  const blockIdMap = new Map<string, string>()
  for (const block of sourceBlocks ?? []) {
    const { data: newBlock } = await supabase
      .from('session_blocks')
      .insert({ event_id: newEvent.id, title: block.title, order_index: block.order_index })
      .select('id')
      .single()
    if (newBlock) blockIdMap.set(block.id, newBlock.id)
  }

  const { data: sourceLines } = await supabase
    .from('session_exercises')
    .select(
      'session_block_id, order_index, raw_text, is_structured, observable_id, sets, reps, weight_kg, distance_meters, time_seconds, rest_seconds'
    )
    .eq('event_id', input.sourceEventId)
    .is('replaces_id', null) // solo líneas genéricas

  if (sourceLines?.length) {
    await supabase.from('session_exercises').insert(
      sourceLines.map((line) => ({
        event_id: newEvent.id,
        session_block_id: line.session_block_id ? blockIdMap.get(line.session_block_id) ?? null : null,
        order_index: line.order_index,
        raw_text: line.raw_text,
        is_structured: line.is_structured,
        observable_id: line.observable_id,
        sets: line.sets,
        reps: line.reps,
        weight_kg: line.weight_kg,
        distance_meters: line.distance_meters,
        time_seconds: line.time_seconds,
        rest_seconds: line.rest_seconds,
      }))
    )
  }

  await logAudit({
    organizationId: source.organization_id,
    actorMembershipId: actor.id,
    action: 'event.create',
    entityType: 'event',
    entityId: newEvent.id,
    metadata: { clonedFrom: input.sourceEventId },
  })

  return newEvent
}
