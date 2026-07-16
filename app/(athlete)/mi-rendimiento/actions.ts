'use server'

import { revalidatePath } from 'next/cache'
import { editObservation, deleteObservation } from '@/domains/observations/manual-entry'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function editResultAction(id: string, value: number) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  try {
    await editObservation({ observationId: id, organizationId: membership.organizationId, value })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo corregir' }
  }

  revalidatePath('/mi-rendimiento')
  return { error: null }
}

export async function deleteResultAction(id: string) {
  await deleteObservation({ observationId: id })
  revalidatePath('/mi-rendimiento')
}
