export type ObservationSourceType =
  | 'competencia'
  | 'entrenamiento'
  | 'assessment'
  | 'wearable'
  | 'manual'
  | 'importacion'
  | 'checkin'

export type ObservationState = 'planificado' | 'ejecutado' | 'omitido'
export type ValidationStatus = 'no_verificado' | 'verificado' | 'oficial' | 'importado_sin_validar'
export type RecordType = 'oficial' | 'entrenamiento'

export interface Observation {
  id: string
  organizationId: string
  athleteMembershipId: string
  observableId: string
  value: number
  date: string
  sourceType: ObservationSourceType
  eventId: string | null
  assessmentId: string | null
  importId: string | null
  validationStatus: ValidationStatus
  state: ObservationState
  fulfillsObservationId: string | null
  supersededBy: string | null
  notes: string | null
  createdByMembershipId: string
}

export interface PersonalRecord {
  id: string
  athleteMembershipId: string
  observableId: string
  recordType: RecordType
  bestObservationId: string
  value: number
  achievedDate: string
}

export interface CreateObservationInput {
  organizationId: string
  athleteMembershipId: string
  observableId: string
  value: number
  date: string
  sourceType: ObservationSourceType
  eventId?: string
  state?: ObservationState
  fulfillsObservationId?: string
  notes?: string
  /** contextKeyId -> valor. El tipo de valor debe coincidir con ContextKey.data_type. */
  context?: Record<string, number | string | boolean>
}

export interface CorrectObservationInput {
  observationId: string
  newValue: number
  reason?: string
}
