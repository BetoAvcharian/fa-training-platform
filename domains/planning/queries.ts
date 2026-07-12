import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import type { Plan, Objective } from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPlan(row: any): Plan {
  return {
    id: row.id,
    organizationId: row.organization_id,
    parentPlanId: row.parent_plan_id,
    type: row.type,
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    groupId: row.group_id,
    athleteMembershipId: row.athlete_membership_id,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapObjective(row: any): Objective {
  return {
    id: row.id,
    organizationId: row.organization_id,
    athleteMembershipId: row.athlete_membership_id,
    planId: row.plan_id,
    category: row.category,
    observableId: row.observable_id,
    targetValue: row.target_value,
    targetDate: row.target_date,
    description: row.description,
    achieved: row.achieved,
    createdAt: row.created_at,
  }
}

/** Árbol completo de planes de la organización — temporadas (raíz) y sus hijos. */
export async function getPlans(organizationId: string, client?: AppSupabaseClient): Promise<Plan[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('organization_id', organizationId)
    .order('start_date', { ascending: true })

  if (error) throw new DomainError('NOT_FOUND', error.message)
  return (data ?? []).map(mapPlan)
}

/** Objetivos visibles para el usuario autenticado (RLS: staff ve todos, atleta solo los propios). */
export async function getObjectives(
  organizationId: string,
  athleteMembershipId?: string,
  client?: AppSupabaseClient
): Promise<Objective[]> {
  const supabase = client ?? (await createServerClient())
  let query = supabase.from('objectives').select('*').eq('organization_id', organizationId)
  if (athleteMembershipId) query = query.eq('athlete_membership_id', athleteMembershipId)

  const { data, error } = await query.order('target_date', { ascending: true, nullsFirst: false })
  if (error) throw new DomainError('NOT_FOUND', error.message)
  return (data ?? []).map(mapObjective)
}
