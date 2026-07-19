import { getTodayISO } from '@/lib/today'
import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { calculateWaPoints } from '@/domains/performance/wa-points'
import { logAudit } from '@/domains/audit/mutations'

export async function createCompetition(
  input: { organizationId: string; title: string; date: string; location?: string; locationMapUrl?: string },
  client?: AppSupabaseClient
): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor || actor.organizationId !== input.organizationId) {
    throw new DomainError('PERMISSION', 'No autenticado')
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      organization_id: input.organizationId,
      type: 'competencia',
      title: input.title,
      date: input.date,
      location: input.location ?? null,
      location_map_url: input.locationMapUrl ?? null,
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

/**
 * Un atleta se inscribe a sí mismo a una competencia (a diferencia de
 * assignAthleteToEvent, que un coach usa para inscribir a cualquiera
 * — acá el propio atleta solo puede anotarse a sí mismo).
 */
export async function selfEnrollInCompetition(
  input: { eventId: string; organizationId: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor) throw new DomainError('PERMISSION', 'No autenticado')

  const { error } = await supabase
    .from('event_assignments')
    .insert({ event_id: input.eventId, assignee_type: 'person', assignee_id: actor.id })

  if (error) throw new DomainError('CONFLICT', error.message)

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'event.assign',
    entityType: 'event',
    entityId: input.eventId,
    metadata: { selfEnrolled: true },
  })
}

/** Carga un resultado de competencia — mismo mecanismo que Registros, pero source_type='competencia' y vinculado al Event. Un atleta solo puede cargar el propio. */
export async function recordCompetitionResult(
  input: {
    eventId: string
    athleteMembershipId: string
    organizationId: string
    observableId: string
    value: number
    windMs?: number
  },
  client?: AppSupabaseClient
): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor) throw new DomainError('PERMISSION', 'No autenticado')
  if (actor.role === 'athlete' && actor.id !== input.athleteMembershipId) {
    throw new DomainError('PERMISSION', 'Solo podés cargar tu propio resultado')
  }

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

  if (input.windMs !== undefined) {
    await supabase.from('observations').update({ wind_ms: input.windMs }).eq('id', data as string)
  }

  // Puntaje World Athletics automático — el lugar donde más importa,
  // porque acá es donde se cargan las marcas de competencia de verdad.
  const { data: athleteRow } = await supabase
    .from('memberships')
    .select('people(gender)')
    .eq('id', input.athleteMembershipId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gender = (athleteRow as any)?.people?.gender ?? null
  const waPoints = await calculateWaPoints(input.observableId, gender, input.value, supabase)
  if (waPoints !== null) {
    await supabase.from('observations').update({ wa_points: waPoints }).eq('id', data as string)
  }

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
