export type AuditAction =
  | 'membership.invite'
  | 'membership.reassign_coach'
  | 'membership.deactivate'
  | 'membership.accept_invite'
  | 'catalog.observable_create'
  | 'catalog.item_hidden'
  | 'event.create'
  | 'event.assign'
  | 'session_exercise.create'
  | 'session_exercise.exception_create'
  | 'observation.create'
  | 'observation.correct'

export interface AuditLogInput {
  organizationId: string
  actorMembershipId: string
  action: AuditAction
  entityType: string
  entityId: string
  beforeState?: Record<string, unknown>
  afterState?: Record<string, unknown>
  metadata?: Record<string, unknown>
}
