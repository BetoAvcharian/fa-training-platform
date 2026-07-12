'use server'

import { revalidatePath } from 'next/cache'
import { createObservable, hideGlobalItem } from '@/domains/catalog/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

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

  revalidatePath('/biblioteca')
  return { error: null }
}

export async function hideObservableAction(observableId: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return

  await hideGlobalItem({
    organizationId: membership.organizationId,
    entityType: 'observable',
    entityId: observableId,
  })
  revalidatePath('/biblioteca')
}
