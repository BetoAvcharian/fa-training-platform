'use server'

import { revalidatePath } from 'next/cache'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { createEvent, cloneEvent, addSessionLine } from '@/domains/events/mutations'
import { createServerClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'

export async function createTemplateAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const title = String(formData.get('title') ?? '')
  const lineTexts = formData.getAll('lineText').map(String)
  const lineSports = formData.getAll('lineSport').map(String) as Array<'Atletismo' | 'Fuerza'>

  if (!title.trim()) return { error: 'Falta el título' }

  try {
    const event = await createEvent({
      organizationId: membership.organizationId,
      type: 'entrenamiento',
      title,
      assignments: [],
      isTemplate: true,
    })

    for (let i = 0; i < lineTexts.length; i++) {
      if (lineTexts[i].trim()) {
        await addSessionLine({ eventId: event.id, sportName: lineSports[i] ?? 'Atletismo', rawText: lineTexts[i] })
      }
    }
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/plantillas')
  return { error: null }
}

export async function deleteTemplateAction(id: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const supabase = await createServerClient()
  const { error } = await supabase.from('events').delete().eq('id', id).eq('organization_id', membership.organizationId).eq('is_template', true)
  if (error) return { error: error.message }

  revalidatePath('/plantillas')
  return { error: null }
}

export async function applyTemplateAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const templateId = String(formData.get('templateId') ?? '')
  const mode = String(formData.get('mode') ?? 'single')
  const athleteIds = formData.getAll('athleteIds').map(String)
  const groupId = String(formData.get('groupId') ?? '')

  if (!templateId) return { error: 'Faltan datos' }
  if (athleteIds.length === 0 && !groupId) return { error: 'Elegí atletas o un grupo' }

  const newAssignments = [
    ...athleteIds.map((id) => ({ type: 'person' as const, id })),
    ...(groupId ? [{ type: 'group' as const, id: groupId }] : []),
  ]

  let dates: string[] = []

  if (mode === 'range') {
    const startDate = String(formData.get('startDate') ?? '')
    const endDate = String(formData.get('endDate') ?? '')
    const weekdays = formData.getAll('weekdays').map(Number) // 0=domingo ... 6=sábado
    if (!startDate || !endDate) return { error: 'Faltan las fechas del rango' }
    if (weekdays.length === 0) return { error: 'Elegí al menos un día de la semana' }
    if (endDate < startDate) return { error: 'La fecha de hasta es anterior a la de desde' }

    const cursor = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    let guard = 0
    while (cursor <= end && guard < 400) {
      if (weekdays.includes(cursor.getDay())) {
        dates.push(cursor.toISOString().slice(0, 10))
      }
      cursor.setDate(cursor.getDate() + 1)
      guard++
    }
    if (dates.length === 0) return { error: 'No hay ninguna fecha que coincida con esos días en ese rango' }
    if (dates.length > 60) return { error: `Son ${dates.length} entrenamientos de una — achicá el rango, es demasiado de una sola vez` }
  } else {
    const date = String(formData.get('date') ?? '')
    if (!date) return { error: 'Faltan datos' }
    dates = [date]
  }

  try {
    await Promise.all(dates.map((date) => cloneEvent({ sourceEventId: templateId, newDate: date, newAssignments })))
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo aplicar la plantilla' }
  }

  revalidatePath('/calendario')
  revalidatePath('/plantillas')
  return { error: null, count: dates.length }
}
