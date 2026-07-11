'use server'

import { revalidatePath } from 'next/cache'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { createEvent as createEventDomain, addSessionLine as addSessionLineDomain } from '@/domains/events/mutations'
import { DomainError } from '@/types/errors'

export async function createEventAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  const title = String(formData.get('title') ?? '')
  const date = String(formData.get('date') ?? '')
  const athleteId = String(formData.get('athleteId') ?? '')

  if (!title || !date || !athleteId) {
    throw new DomainError('VALIDATION', 'Faltan datos para crear el entrenamiento')
  }

  await createEventDomain({
    organizationId: membership.organizationId,
    type: 'entrenamiento',
    title,
    date,
    assignments: [{ type: 'person', id: athleteId }],
  })

  revalidatePath('/calendario')
}

export async function addSessionLineAction(eventId: string, sport: 'Fuerza' | 'Atletismo', formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  const rawText = String(formData.get('rawText') ?? '')
  if (!rawText.trim()) return

  await addSessionLineDomain({ eventId, sportName: sport, rawText })

  revalidatePath('/calendario')
}
