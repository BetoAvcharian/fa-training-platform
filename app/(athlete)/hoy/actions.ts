'use server'

import { getTodayISO } from '@/lib/today'
import { revalidatePath } from 'next/cache'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { submitCheckin as submitCheckinDomain } from '@/domains/observations/checkin'
import { completeSessionLine as completeSessionLineDomain } from '@/domains/observations/completion'
import { submitSessionFeedback as submitSessionFeedbackDomain } from '@/domains/observations/session-feedback'
import { DomainError } from '@/types/errors'

export async function submitCheckinAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const energia = formData.get('energia')
  const fatiga = formData.get('fatiga')

  try {
    await submitCheckinDomain({
      organizationId: membership.organizationId,
      athleteMembershipId: membership.id,
      date: getTodayISO(),
      energia: energia ? Number(energia) : undefined,
      fatiga: fatiga ? Number(fatiga) : undefined,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/hoy')
  return { error: null }
}

export async function completeSessionLineAction(sessionExerciseId: string, formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const actualValueRaw = formData.get('actualValue')

  try {
    await completeSessionLineDomain({
      sessionExerciseId,
      athleteMembershipId: membership.id,
      actualValue: actualValueRaw ? Number(actualValueRaw) : undefined,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo completar' }
  }

  revalidatePath('/hoy')
  return { error: null }
}

export async function submitSessionFeedbackAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const eventId = String(formData.get('eventId') ?? '')
  const status = String(formData.get('status') ?? '')
  const notes = String(formData.get('notes') ?? '')

  if (!eventId) return { error: 'Falta el entrenamiento' }
  if (!['completado', 'completado_con_observacion', 'no_completado'].includes(status)) {
    return { error: 'Estado inválido' }
  }

  try {
    await submitSessionFeedbackDomain({ eventId, status: status as never, notes: notes || undefined })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/hoy')
  return { error: null }
}
