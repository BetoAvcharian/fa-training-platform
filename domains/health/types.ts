export type HealthEpisodeType = 'lesion' | 'medicacion' | 'ciclo_menstrual'
export type HealthEpisodeStatus = 'activo' | 'resuelto'

export interface HealthEpisode {
  id: string
  organizationId: string
  athleteMembershipId: string
  type: HealthEpisodeType
  title: string
  severity: string | null
  status: HealthEpisodeStatus
  startDate: string
  endDate: string | null
  notes: string | null
  createdAt: string
}

export interface CreateHealthEpisodeInput {
  athleteMembershipId: string
  organizationId: string
  type: HealthEpisodeType
  title: string
  severity?: string
  startDate?: string
  notes?: string
}
