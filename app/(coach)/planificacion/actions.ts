'use server'

import { revalidatePath } from 'next/cache'
import { createPlan, createObjective, markObjectiveAchieved, updatePlanDates, updatePlan, deletePlan, updateObjective, deleteObjective } from '@/domains/planning/mutations'
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

export async function updatePlanDatesAction(id: string, startDate: string, endDate: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  try {
    await updatePlanDates({ id, organizationId: membership.organizationId, startDate, endDate })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/planificacion')
  return { error: null }
}

export async function updatePlanAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const id = String(formData.get('id') ?? '')
  const title = String(formData.get('title') ?? '')
  const startDate = String(formData.get('startDate') ?? '') || undefined
  const endDate = String(formData.get('endDate') ?? '') || undefined

  if (!title.trim()) return { error: 'Falta el título' }

  try {
    await updatePlan({ id, organizationId: membership.organizationId, title, startDate, endDate })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/planificacion')
  return { error: null }
}

export async function deletePlanAction(id: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  try {
    await deletePlan(id, membership.organizationId)
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo borrar' }
  }

  revalidatePath('/planificacion')
  return { error: null }
}

export async function updateObjectiveAction(formData: FormData) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  const id = String(formData.get('id') ?? '')
  const category = String(formData.get('category') ?? '')
  const description = String(formData.get('description') ?? '')
  const targetDate = String(formData.get('targetDate') ?? '') || undefined

  if (!description.trim()) return { error: 'Falta la descripción' }

  try {
    await updateObjective({ id, organizationId: membership.organizationId, category, description, targetDate })
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo guardar' }
  }

  revalidatePath('/planificacion')
  revalidatePath('/mis-objetivos')
  return { error: null }
}

export async function deleteObjectiveAction(id: string) {
  const membership = await getMyActiveMembership()
  if (!membership) return { error: 'No autenticado' }

  try {
    await deleteObjective(id, membership.organizationId)
  } catch (e) {
    return { error: e instanceof DomainError ? e.message : 'No se pudo borrar' }
  }

  revalidatePath('/planificacion')
  revalidatePath('/mis-objetivos')
  return { error: null }
}
