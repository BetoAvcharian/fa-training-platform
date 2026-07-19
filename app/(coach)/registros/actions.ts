'use server'

import { revalidatePath } from 'next/cache'
import { createObservable, hideGlobalItem, unhideGlobalItem, updateObservable } from '@/domains/catalog/mutations'
import { recordObservation, editObservation, deleteObservation } from '@/domains/observations/manual-entry'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function recordObservationAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const athleteMembershipId = String(formData.get('athleteMembershipId') ?? '')
  const observableId = String(formData.get('observableId') ?? '')
  const value = Number(formData.get('value'))
  const waPointsRaw = String(formData.get('waPoints') ?? '')
  const waPoints = waPointsRaw ? Number(waPointsRaw) : undefined

  if (!athleteMembershipId) return { error: 'Falta elegir atleta' }
  if (!observableId) return { error: 'Falta elegir qué registrar' }
  if (!value || Number.isNaN(value)) return { error: 'Valor inválido' }
  if (waPointsRaw && Number.isNaN(waPoints)) return { error: 'Puntos inválidos' }

  try {
    await recordObservation({
      athleteMembershipId,
      organizationId: membership.organizationId,
      observableId,
      value,
      waPoints,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/registros')
  return { error: null }
}

export async function createObservableAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const sportId = String(formData.get('sportId') ?? '')
  const unitId = String(formData.get('unitId') ?? '')
  const name = String(formData.get('name') ?? '')
  const isPerformance = formData.get('isPerformance') === 'on'

  if (!sportId || !unitId || !name.trim()) return { error: 'Faltan datos' }

  try {
    await createObservable({
      organizationId: membership.organizationId,
      sportId,
      unitId,
      name,
      isPerformance,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/registros')
  return { error: null }
}

export async function updateObservableAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '')

  if (!id || !name.trim()) return { error: 'Faltan datos' }

  try {
    await updateObservable({ id, organizationId: membership.organizationId, name })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/registros')
  return { error: null }
}

export async function hideObservableAction(observableId: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  try {
    await hideGlobalItem({
      organizationId: membership.organizationId,
      entityType: 'observable',
      entityId: observableId,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo ocultar' }
  }

  revalidatePath('/registros')
  return { error: null }
}

export async function unhideObservableAction(observableId: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  try {
    await unhideGlobalItem({
      organizationId: membership.organizationId,
      entityType: 'observable',
      entityId: observableId,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo mostrar' }
  }

  revalidatePath('/registros')
  return { error: null }
}

export async function editRecordAction(id: string, value: number) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  try {
    await editObservation({ observationId: id, organizationId: membership.organizationId, value })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo corregir' }
  }

  revalidatePath('/registros')
  return { error: null }
}

export async function deleteRecordAction(id: string) {
  await deleteObservation({ observationId: id })
  revalidatePath('/registros')
}
