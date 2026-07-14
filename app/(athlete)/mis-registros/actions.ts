'use server'

import { revalidatePath } from 'next/cache'
import { recordObservation } from '@/domains/observations/manual-entry'
import { createObservable } from '@/domains/catalog/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function recordMyResultAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const observableId = String(formData.get('observableId') ?? '')
  const value = Number(formData.get('value'))
  const date = String(formData.get('date') ?? '') || undefined

  if (!observableId) return { error: 'Falta elegir qué registrar' }
  if (!value || Number.isNaN(value)) return { error: 'Valor inválido' }

  try {
    await recordObservation({
      athleteMembershipId: membership.id,
      organizationId: membership.organizationId,
      observableId,
      value,
      date,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/mis-registros')
  revalidatePath('/mi-rendimiento')
  return { error: null }
}

export async function createMyObservableAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const sportId = String(formData.get('sportId') ?? '')
  const unitId = String(formData.get('unitId') ?? '')
  const name = String(formData.get('name') ?? '')

  if (!sportId || !unitId || !name.trim()) return { error: 'Faltan datos' }

  try {
    await createObservable({
      organizationId: membership.organizationId,
      sportId,
      unitId,
      name,
      isPerformance: true,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/mis-registros')
  return { error: null }
}
