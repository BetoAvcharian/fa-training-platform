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
  const date = String(formData.get('date') ?? '')
  const athleteIds = formData.getAll('athleteIds').map(String)
  const groupId = String(formData.get('groupId') ?? '')

  if (!templateId || !date) return { error: 'Faltan datos' }
  if (athleteIds.length === 0 && !groupId) return { error: 'Elegí atletas o un grupo' }

  const newAssignments = [
    ...athleteIds.map((id) => ({ type: 'person' as const, id })),
    ...(groupId ? [{ type: 'group' as const, id: groupId }] : []),
  ]

  try {
    await cloneEvent({ sourceEventId: templateId, newDate: date, newAssignments })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo aplicar la plantilla' }
  }

  revalidatePath('/calendario')
  revalidatePath('/plantillas')
  return { error: null }
}
