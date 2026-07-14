'use server'

import { revalidatePath } from 'next/cache'
import { createObjective, markObjectiveAchieved } from '@/domains/planning/mutations'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function createMyObjectiveAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const category = String(formData.get('category') ?? '')
  const description = String(formData.get('description') ?? '')
  const targetDate = String(formData.get('targetDate') ?? '') || undefined

  if (!description.trim()) return { error: 'Falta la descripción' }

  try {
    await createObjective({
      organizationId: membership.organizationId,
      athleteMembershipId: membership.id,
      category: category as never,
      description,
      targetDate,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/mis-objetivos')
  return { error: null }
}

export async function markMyObjectiveAchievedAction(id: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return

  await markObjectiveAchieved(id, membership.organizationId)
  revalidatePath('/mis-objetivos')
}
