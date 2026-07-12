'use server'

import { revalidatePath } from 'next/cache'
import { createHealthEpisode, resolveHealthEpisode } from '@/domains/health/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { logAnthropometryValue } from '@/domains/observations/anthropometry'
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

export async function logAnthropometryAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const observableId = String(formData.get('observableId') ?? '')
  const value = Number(formData.get('value'))

  if (!observableId) return { error: 'Falta elegir qué cargar' }
  if (!value || Number.isNaN(value)) return { error: 'Valor inválido' }

  try {
    await logAnthropometryValue({
      athleteMembershipId: membership.id,
      organizationId: membership.organizationId,
      observableId,
      value,
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

export async function updateHealthEpisodeAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const { updateHealthEpisode } = await import('@/domains/health/mutations')

  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '')
  const notes = String(formData.get('notes') ?? '')
  const startDate = String(formData.get('startDate') ?? '')

  if (!id) return { error: 'Falta el episodio' }
  if (!title.trim()) return { error: 'Falta el título' }

  try {
    await updateHealthEpisode({
      id,
      organizationId: membership.organizationId,
      title,
      notes,
      startDate: startDate || undefined,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/mi-salud')
  return { error: null }
}
