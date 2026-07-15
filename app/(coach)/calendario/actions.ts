'use server'

import { revalidatePath } from 'next/cache'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getEventsForRange, getEventAssignments } from '@/domains/events/queries'
import {
  createEvent as createEventDomain,
  addSessionLine as addSessionLineDomain,
  cloneEvent as cloneEventDomain,
  assignAthleteToEvent as assignAthleteToEventDomain,
} from '@/domains/events/mutations'
import { DomainError } from '@/types/errors'

export async function createEventAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const title = String(formData.get('title') ?? '')
  const date = String(formData.get('date') ?? '')
  const athleteId = String(formData.get('athleteId') ?? '')
  const groupId = String(formData.get('groupId') ?? '')
  const firstLine = String(formData.get('firstLine') ?? '')
  const firstLineSport = String(formData.get('firstLineSport') ?? 'Atletismo') as 'Atletismo' | 'Fuerza'

  if (!title || !date || (!athleteId && !groupId)) {
    return { error: 'Faltan datos para crear el entrenamiento' }
  }

  try {
    const event = await createEventDomain({
      organizationId: membership.organizationId,
      type: 'entrenamiento',
      title,
      date,
      assignments: groupId ? [{ type: 'group', id: groupId }] : [{ type: 'person', id: athleteId }],
    })

    if (firstLine.trim()) {
      await addSessionLineDomain({ eventId: event.id, sportName: firstLineSport, rawText: firstLine })
    }
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo crear' }
  }

  revalidatePath('/calendario')
  return { error: null }
}

export async function createExceptionAction(
  eventId: string,
  replacesId: string,
  sport: 'Fuerza' | 'Atletismo',
  formData: FormData
) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const athleteMembershipId = String(formData.get('athleteMembershipId') ?? '')
  const rawText = String(formData.get('rawText') ?? '')
  if (!athleteMembershipId || !rawText.trim()) return { error: 'Faltan datos' }

  try {
    // La excepción necesita que el atleta tenga una asignación DIRECTA
    // a este Event (no alcanza con que esté cubierto por la del grupo)
    // — si todavía no la tiene, se la creamos ahora, sin duplicar si
    // ya existía.
    const assignments = await getEventAssignments(eventId)
    let assignment = assignments.find((a) => a.assigneeType === 'person' && a.assigneeId === athleteMembershipId)

    if (!assignment) {
      await assignAthleteToEventDomain({ eventId, athleteMembershipId, organizationId: membership.organizationId })
      const refreshed = await getEventAssignments(eventId)
      assignment = refreshed.find((a) => a.assigneeType === 'person' && a.assigneeId === athleteMembershipId)
    }

    if (!assignment) throw new DomainError('CONFLICT', 'No se pudo asignar al atleta')

    await addSessionLineDomain({
      eventId,
      sportName: sport,
      rawText,
      exceptionForAssignmentIds: [assignment.id],
      replacesId,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo crear la excepción' }
  }

  revalidatePath('/calendario')
  return { error: null }
}

export async function addSessionLineAction(eventId: string, sport: 'Fuerza' | 'Atletismo', formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return

  const rawText = String(formData.get('rawText') ?? '')
  if (!rawText.trim()) return

  try {
    await addSessionLineDomain({ eventId, sportName: sport, rawText })
  } catch {
    // se guarda igual sin estructurar por diseño (SmartLine nunca bloquea
    // la carga) — un error acá sería otra cosa (permisos, conexión); no
    // rompemos la pantalla por eso, simplemente no se agrega la línea.
  }

  revalidatePath('/calendario')
}

/**
 * Copia todos los entrenamientos de una semana a otra, corriendo la
 * misma cantidad de días para cada Event (mismo día de la semana).
 * Reusa cloneEvent uno por uno — ya clona bloques y líneas genéricas.
 */
export async function copyWeekAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const sourceWeekStart = String(formData.get('sourceWeekStart') ?? '')
  const targetWeekStart = String(formData.get('targetWeekStart') ?? '')
  if (!sourceWeekStart || !targetWeekStart) return { error: 'Faltan fechas' }

  const offsetDays = Math.round(
    (new Date(targetWeekStart + 'T00:00:00').getTime() - new Date(sourceWeekStart + 'T00:00:00').getTime()) / 86400000
  )
  if (offsetDays === 0) return { error: 'Elegí una semana distinta' }

  const sourceWeekEnd = new Date(sourceWeekStart + 'T00:00:00')
  sourceWeekEnd.setDate(sourceWeekEnd.getDate() + 6)
  const sourceWeekEndStr = sourceWeekEnd.toISOString().slice(0, 10)

  try {
    const events = await getEventsForRange(membership.organizationId, sourceWeekStart, sourceWeekEndStr)
    for (const event of events) {
      if (!event.date) continue
      const newDate = new Date(event.date + 'T00:00:00')
      newDate.setDate(newDate.getDate() + offsetDays)
      await cloneEventDomain({ sourceEventId: event.id, newDate: newDate.toISOString().slice(0, 10) })
    }
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo copiar la semana' }
  }

  revalidatePath('/calendario')
  return { error: null }
}

/** Duplica un solo entrenamiento a una fecha nueva — sirve como "plantilla al vuelo". */
export async function duplicateEventAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const sourceEventId = String(formData.get('sourceEventId') ?? '')
  const newDate = String(formData.get('newDate') ?? '')
  if (!sourceEventId || !newDate) return { error: 'Faltan datos' }

  try {
    await cloneEventDomain({ sourceEventId, newDate })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo duplicar' }
  }

  revalidatePath('/calendario')
  return { error: null }
}
