'use server'

import { revalidatePath } from 'next/cache'
import { recordObservation } from '@/domains/observations/manual-entry'
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
