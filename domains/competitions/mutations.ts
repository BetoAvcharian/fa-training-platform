import { getTodayISO } from '@/lib/today'
import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from '@/domains/athletes/rules'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { logAudit } from '@/domains/audit/mutations'

export async function createCompetition(
  input: { organizationId: string; title: string; date: string },
  client?: AppSupabaseClient
): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  const { data, error } = await supabase
    .from('events')
    .insert({
      organization_id: input.organizationId,
      type: 'competencia',
      title: input.title,
      date: input.date,
      created_by_membership_id: actor.id,
    })
    .select('id')
    .single()

  if (error || !data) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo crear la competencia')

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'event.create',
    entityType: 'event',
    entityId: data.id,
    metadata: { type: 'competencia' },
  })

  return { id: data.id }
}

/** Carga un resultado de competencia — mismo mecanismo que Registros, pero source_type='competencia' y vinculado al Event. */
export async function recordCompetitionResult(
  input: { eventId: string; athleteMembershipId: string; organizationId: string; observableId: string; value: number },
  client?: AppSupabaseClient
): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor) throw new DomainError('PERMISSION', 'No autenticado')

  const { data: event } = await supabase.from('events').select('date').eq('id', input.eventId).maybeSingle()

  const { data, error } = await supabase.rpc('create_observation_with_context', {
    p_organization_id: input.organizationId,
    p_athlete_membership_id: input.athleteMembershipId,
    p_observable_id: input.observableId,
    p_value: input.value,
    p_date: event?.date ?? getTodayISO(),
    p_source_type: 'competencia',
    p_created_by_membership_id: actor.id,
    p_event_id: input.eventId,
  })

  if (error || !data) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo guardar el resultado')

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'observation.create',
    entityType: 'observation',
    entityId: data as string,
    metadata: { eventId: input.eventId, kind: 'competencia' },
  })

  return { id: data as string }
}
