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

export interface AthleteSessionFeedback {
  athleteMembershipId: string
  athleteName: string
  status: SessionFeedbackStatus | null
  notes: string | null
}

/**
 * El feedback de TODOS los atletas asignados a un entrenamiento —
 * para que el entrenador vea, al abrir el detalle, quién completó
 * (verde), quién completó con alguna observación (amarillo) y quién
 * todavía no cargó nada (blanco/status null). RLS ya limita esto a
 * manager o coach de la organización del evento.
 */
export async function getFeedbackForEvent(
  eventId: string,
  assignedAthleteIds: string[],
  client?: AppSupabaseClient
): Promise<AthleteSessionFeedback[]> {
  const supabase = client ?? (await createServerClient())
  if (assignedAthleteIds.length === 0) return []

  const [{ data: feedbackRows, error: feedbackError }, { data: peopleRows, error: peopleError }] = await Promise.all([
    supabase.from('session_feedback').select('athlete_membership_id, status, notes').eq('event_id', eventId),
    supabase
      .from('memberships')
      .select('id, people(first_name, last_name)')
      .in('id', assignedAthleteIds),
  ])

  if (feedbackError) throw new DomainError('NOT_FOUND', feedbackError.message)
  if (peopleError) throw new DomainError('NOT_FOUND', peopleError.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feedbackByAthlete = new Map((feedbackRows ?? []).map((r: any) => [r.athlete_membership_id, r]))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (peopleRows ?? []).map((row: any) => {
    const fb = feedbackByAthlete.get(row.id)
    return {
      athleteMembershipId: row.id,
      athleteName: row.people ? `${row.people.first_name} ${row.people.last_name}` : '—',
      status: fb ? (fb.status as SessionFeedbackStatus) : null,
      notes: fb ? fb.notes : null,
    }
  })
}
