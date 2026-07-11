'use server'

import { revalidatePath } from 'next/cache'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { submitCheckin as submitCheckinDomain } from '@/domains/observations/checkin'
import { completeSessionLine as completeSessionLineDomain } from '@/domains/observations/completion'
import { DomainError } from '@/types/errors'

export async function submitCheckinAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  const energia = formData.get('energia')
  const fatiga = formData.get('fatiga')

  await submitCheckinDomain({
    organizationId: membership.organizationId,
    athleteMembershipId: membership.id,
    date: new Date().toISOString().slice(0, 10),
    energia: energia ? Number(energia) : undefined,
    fatiga: fatiga ? Number(fatiga) : undefined,
  })

  revalidatePath('/hoy')
}

export async function completeSessionLineAction(sessionExerciseId: string, formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  const actualValueRaw = formData.get('actualValue')

  await completeSessionLineDomain({
    sessionExerciseId,
    athleteMembershipId: membership.id,
    actualValue: actualValueRaw ? Number(actualValueRaw) : undefined,
  })

  revalidatePath('/hoy')
}
