import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { logAudit } from '@/domains/audit/mutations'

export type SessionFeedbackStatus = 'completado' | 'completado_con_observacion' | 'no_completado'

export interface SessionFeedback {
  status: SessionFeedbackStatus
  notes: string | null
}

export async function getMySessionFeedback(
  eventId: string,
  athleteMembershipId: string,
  client?: AppSupabaseClient
): Promise<SessionFeedback | null> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('session_feedback')
    .select('status, notes')
    .eq('event_id', eventId)
    .eq('athlete_membership_id', athleteMembershipId)
    .maybeSingle()

  if (error) throw new DomainError('NOT_FOUND', error.message)
  if (!data) return null
  return { status: data.status as SessionFeedbackStatus, notes: data.notes }
}

export async function submitSessionFeedback(
  input: { eventId: string; status: SessionFeedbackStatus; notes?: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor) throw new DomainError('PERMISSION', 'No autenticado')

  const { error } = await supabase.from('session_feedback').upsert(
    {
      event_id: input.eventId,
      athlete_membership_id: actor.id,
      status: input.status,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'event_id,athlete_membership_id' }
  )

  if (error) throw new DomainError('CONFLICT', error.message)

  await logAudit({
    organizationId: actor.organizationId,
    actorMembershipId: actor.id,
    action: 'session_feedback.create',
    entityType: 'event',
    entityId: input.eventId,
    metadata: { status: input.status },
  })
}
