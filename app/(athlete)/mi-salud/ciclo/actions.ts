'use server'

import { revalidatePath } from 'next/cache'
import { logCycleDay, deleteCycleDay, type CycleFlow } from '@/domains/health/cycle'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function logCycleDayAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const date = String(formData.get('date') ?? '')
  const flowRaw = String(formData.get('flow') ?? '')
  const flow = flowRaw ? (flowRaw as CycleFlow) : null
  const symptoms = formData.getAll('symptoms').map(String)
  const notes = String(formData.get('notes') ?? '')

  if (!date) return { error: 'Falta la fecha' }

  try {
    await logCycleDay({
      athleteMembershipId: membership.id,
      organizationId: membership.organizationId,
      date,
      flow,
      symptoms,
      notes: notes || undefined,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/mi-salud/ciclo')
  return { error: null }
}

export async function deleteCycleDayAction(logId: string) {
  await deleteCycleDay(logId)
  revalidatePath('/mi-salud/ciclo')
}
