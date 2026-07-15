'use server'

import { revalidatePath } from 'next/cache'
import { createCompetition, selfEnrollInCompetition, recordCompetitionResult } from '@/domains/competitions/mutations'
import { unassignAthlete } from '@/domains/events/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function createCompetitionAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const title = String(formData.get('title') ?? '')
  const date = String(formData.get('date') ?? '')
  const location = String(formData.get('location') ?? '')
  const locationMapUrl = String(formData.get('locationMapUrl') ?? '')
  if (!title.trim() || !date) return { error: 'Faltan datos' }

  try {
    await createCompetition({
      organizationId: membership.organizationId,
      title,
      date,
      location: location || undefined,
      locationMapUrl: locationMapUrl || undefined,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo crear' }
  }

  revalidatePath('/mis-competencias')
  return { error: null }
}

export async function selfEnrollAction(eventId: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  try {
    await selfEnrollInCompetition({ eventId, organizationId: membership.organizationId })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo anotar' }
  }

  revalidatePath(`/mis-competencias/${eventId}`)
  return { error: null }
}

export async function selfUnenrollAction(eventId: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return

  await unassignAthlete({ eventId, athleteMembershipId: membership.id, organizationId: membership.organizationId })
  revalidatePath(`/mis-competencias/${eventId}`)
}

export async function recordMyResultAction(eventId: string, formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const observableId = String(formData.get('observableId') ?? '')
  const value = Number(formData.get('value'))
  const windRaw = String(formData.get('windMs') ?? '')

  if (!observableId) return { error: 'Faltan datos' }
  if (!value || Number.isNaN(value)) return { error: 'Valor inválido' }

  try {
    await recordCompetitionResult({
      eventId,
      athleteMembershipId: membership.id,
      organizationId: membership.organizationId,
      observableId,
      value,
      windMs: windRaw ? Number(windRaw) : undefined,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath(`/mis-competencias/${eventId}`)
  return { error: null }
}
