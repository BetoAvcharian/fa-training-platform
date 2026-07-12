export type PlanType = 'temporada' | 'macrociclo' | 'mesociclo' | 'microciclo'
export type ObjectiveCategory = 'deportivo' | 'salud' | 'fisico' | 'personal'

export interface Plan {
  id: string
  organizationId: string
  parentPlanId: string | null
  type: PlanType
  title: string
  startDate: string | null
  endDate: string | null
  groupId: string | null
  athleteMembershipId: string | null
  createdAt: string
}

export interface Objective {
  id: string
  organizationId: string
  athleteMembershipId: string
  planId: string | null
  category: ObjectiveCategory
  observableId: string | null
  targetValue: number | null
  targetDate: string | null
  description: string | null
  achieved: boolean
  createdAt: string
}

export interface CreatePlanInput {
  organizationId: string
  parentPlanId?: string
  type: PlanType
  title: string
  startDate?: string
  endDate?: string
  groupId?: string
  athleteMembershipId?: string
}

export interface CreateObjectiveInput {
  organizationId: string
  athleteMembershipId: string
  planId?: string
  category: ObjectiveCategory
  observableId?: string
  targetValue?: number
  targetDate?: string
  description?: string
}
