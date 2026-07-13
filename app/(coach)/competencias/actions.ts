'use server'

import { revalidatePath } from 'next/cache'
import { createCompetition, recordCompetitionResult } from '@/domains/competitions/mutations'
import { assignAthleteToEvent, unassignAthlete } from '@/domains/events/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function createCompetitionAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const title = String(formData.get('title') ?? '')
  const date = String(formData.get('date') ?? '')
  if (!title.trim() || !date) return { error: 'Faltan datos' }

  try {
    await createCompetition({ organizationId: membership.organizationId, title, date })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo crear' }
  }

  revalidatePath('/competencias')
  return { error: null }
}

export async function enrollAthleteAction(eventId: string, formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const athleteMembershipId = String(formData.get('athleteMembershipId') ?? '')
  if (!athleteMembershipId) return { error: 'Falta elegir atleta' }

  try {
    await assignAthleteToEvent({ eventId, athleteMembershipId, organizationId: membership.organizationId })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo inscribir' }
  }

  revalidatePath(`/competencias/${eventId}`)
  return { error: null }
}

export async function unenrollAthleteAction(eventId: string, athleteMembershipId: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return

  await unassignAthlete({ eventId, athleteMembershipId, organizationId: membership.organizationId })
  revalidatePath(`/competencias/${eventId}`)
}

export async function recordResultAction(eventId: string, formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const athleteMembershipId = String(formData.get('athleteMembershipId') ?? '')
  const observableId = String(formData.get('observableId') ?? '')
  const value = Number(formData.get('value'))

  if (!athleteMembershipId || !observableId) return { error: 'Faltan datos' }
  if (!value || Number.isNaN(value)) return { error: 'Valor inválido' }

  try {
    await recordCompetitionResult({
      eventId,
      athleteMembershipId,
      organizationId: membership.organizationId,
      observableId,
      value,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath(`/competencias/${eventId}`)
  return { error: null }
}
