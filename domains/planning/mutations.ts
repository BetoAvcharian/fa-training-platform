import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { logAudit } from '@/domains/audit/mutations'
import type { CreatePlanInput, CreateObjectiveInput } from './types'

export async function createPlan(input: CreatePlanInput, client?: AppSupabaseClient): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')
  if (membership.role !== 'manager' && membership.role !== 'coach') {
    throw new DomainError('PERMISSION', 'Solo manager o entrenador pueden crear planes')
  }

  const { data, error } = await supabase
    .from('plans')
    .insert({
      organization_id: input.organizationId,
      parent_plan_id: input.parentPlanId ?? null,
      type: input.type,
      title: input.title,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      group_id: input.groupId ?? null,
      athlete_membership_id: input.athleteMembershipId ?? null,
      created_by_membership_id: membership.id,
    })
    .select('id')
    .single()

  if (error || !data) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo crear el plan')

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: membership.id,
    action: 'plan.create',
    entityType: 'plan',
    entityId: data.id,
    metadata: { type: input.type },
  })

  return { id: data.id }
}

export async function createObjective(
  input: CreateObjectiveInput,
  client?: AppSupabaseClient
): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  if (!input.observableId && !input.description) {
    throw new DomainError('VALIDATION', 'Un objetivo necesita forma cuantitativa y/o cualitativa')
  }

  const { data, error } = await supabase
    .from('objectives')
    .insert({
      organization_id: input.organizationId,
      athlete_membership_id: input.athleteMembershipId,
      plan_id: input.planId ?? null,
      category: input.category,
      observable_id: input.observableId ?? null,
      target_value: input.targetValue ?? null,
      target_date: input.targetDate ?? null,
      description: input.description ?? null,
      created_by_membership_id: membership.id,
    })
    .select('id')
    .single()

  if (error || !data) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo crear el objetivo')

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: membership.id,
    action: 'objective.create',
    entityType: 'objective',
    entityId: data.id,
    metadata: { category: input.category },
  })

  return { id: data.id }
}

export async function markObjectiveAchieved(
  id: string,
  organizationId: string,
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  const { error } = await supabase.from('objectives').update({ achieved: true }).eq('id', id)
  if (error) throw new DomainError('CONFLICT', error.message)

  await logAudit({
    organizationId,
    actorMembershipId: membership.id,
    action: 'objective.achieve',
    entityType: 'objective',
    entityId: id,
  })
}

/**
 * Mueve/estira un plan (típicamente un mesociclo) desde la vista
 * Anual arrastrando sus bordes — actualiza las mismas fechas que ve
 * la vista de lista, no hay tabla paralela.
 */
export async function updatePlanDates(
  input: { id: string; organizationId: string; startDate: string; endDate: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  const { error } = await supabase
    .from('plans')
    .update({ start_date: input.startDate, end_date: input.endDate })
    .eq('id', input.id)
  if (error) throw new DomainError('CONFLICT', error.message)

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: membership.id,
    action: 'plan.update',
    entityType: 'plan',
    entityId: input.id,
  })
}
