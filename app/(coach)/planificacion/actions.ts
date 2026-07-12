'use server'

import { revalidatePath } from 'next/cache'
import { createPlan, createObjective, markObjectiveAchieved } from '@/domains/planning/mutations'
import { getMyActiveMembership, getRoster } from '@/domains/athletes/queries'
import { DomainError } from '@/types/errors'

export async function createPlanAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const type = String(formData.get('type') ?? '')
  const title = String(formData.get('title') ?? '')
  const parentPlanId = String(formData.get('parentPlanId') ?? '') || undefined

  if (!title.trim()) return { error: 'Falta el título' }
  if (!['temporada', 'macrociclo', 'mesociclo', 'microciclo'].includes(type)) {
    return { error: 'Tipo inválido' }
  }

  try {
    await createPlan({
      organizationId: membership.organizationId,
      type: type as never,
      title,
      parentPlanId,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/planificacion')
  return { error: null }
}

export async function createObjectiveAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const athleteMembershipId = String(formData.get('athleteMembershipId') ?? '')
  const category = String(formData.get('category') ?? '')
  const description = String(formData.get('description') ?? '')
  const targetDate = String(formData.get('targetDate') ?? '') || undefined

  if (!athleteMembershipId) return { error: 'Falta elegir atleta' }
  if (!description.trim()) return { error: 'Falta la descripción del objetivo' }

  try {
    await createObjective({
      organizationId: membership.organizationId,
      athleteMembershipId,
      category: category as never,
      description,
      targetDate,
    })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/planificacion')
  return { error: null }
}

export async function markObjectiveAchievedAction(id: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return

  await markObjectiveAchieved(id, membership.organizationId)
  revalidatePath('/planificacion')
  revalidatePath('/mis-objetivos')
}

export async function getRosterForForm() {
  const membership = await getMyActiveMembership()
  if (!membership) return []
  return getRoster(membership.organizationId)
}
