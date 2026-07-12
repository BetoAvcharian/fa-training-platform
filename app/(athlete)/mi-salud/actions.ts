'use server'

import { revalidatePath } from 'next/cache'
import { createHealthEpisode, resolveHealthEpisode } from '@/domains/health/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function createHealthEpisodeAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const type = String(formData.get('type') ?? '')
  const title = String(formData.get('title') ?? '')
  const notes = String(formData.get('notes') ?? '')

  if (!title.trim()) return { error: 'Falta el título' }
  if (type !== 'lesion' && type !== 'medicacion' && type !== 'ciclo_menstrual') {
    return { error: 'Tipo inválido' }
  }

  try {
    await createHealthEpisode({
      athleteMembershipId: membership.id,
      organizationId: membership.organizationId,
      type,
      title,
      notes: notes || undefined,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/mi-salud')
  return { error: null }
}

export async function resolveHealthEpisodeAction(id: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return

  await resolveHealthEpisode(id, membership.organizationId)
  revalidatePath('/mi-salud')
}
