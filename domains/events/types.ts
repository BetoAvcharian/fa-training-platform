export type EventType = 'entrenamiento' | 'competencia' | 'viaje' | 'concentracion' | 'medico' | 'reunion'
export type AssigneeType = 'person' | 'group'

export interface Event {
  id: string
  organizationId: string
  type: EventType
  title: string
  date: string | null
  isTemplate: boolean
  createdByMembershipId: string
}

export interface EventAssignment {
  id: string
  eventId: string
  assigneeType: AssigneeType
  assigneeId: string
}

export interface SessionBlock {
  id: string
  eventId: string
  title: string
  orderIndex: number
}

export interface SessionExercise {
  id: string
  eventId: string
  sessionBlockId: string | null
  orderIndex: number
  rawText: string
  isStructured: boolean
  observableId: string | null
  sets: number | null
  reps: number | null
  weightKg: number | null
  distanceMeters: number | null
  timeSeconds: number | null
  restSeconds: number | null
  replacesId: string | null
}

/** Resultado de interpretar una línea de SmartLine — estructurado o no, nunca falla. */
export interface ParsedLine {
  raw: string
  isStructured: boolean
  observableName?: string
  sets?: number
  reps?: number
  weightKg?: number
  distanceMeters?: number
  timeSeconds?: number
  restSeconds?: number
}

export interface CreateEventInput {
  organizationId: string
  type: EventType
  title: string
  date: string
  assignments: Array<{ type: AssigneeType; id: string }>
}

export interface AddSessionLineInput {
  eventId: string
  sessionBlockId?: string
  sportName: 'Fuerza' | 'Atletismo'
  rawText: string
  /** Si viene vacío/undefined, la línea es genérica (vale para todos los asignados). */
  exceptionForAssignmentIds?: string[]
  /** Requerido si exceptionForAssignmentIds tiene valores: qué línea genérica reemplaza. */
  replacesId?: string
}
