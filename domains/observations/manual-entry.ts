import { getTodayISO } from '@/lib/today'
import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { logAudit } from '@/domains/audit/mutations'

/**
 * Carga manual de un valor para cualquier Observable del catálogo — el
 * caso general del que antropometría/signos vitales es un caso
 * particular. El atleta puede cargar el suyo; coach/manager pueden
 * cargarle uno a un atleta (registrar un test tomado en persona).
 */
export async function recordObservation(
  input: {
    athleteMembershipId: string
    organizationId: string
    observableId: string
    value: number
    date?: string
    notes?: string
  },
  client?: AppSupabaseClient
): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor) throw new DomainError('PERMISSION', 'No autenticado')
  if (actor.role === 'athlete' && actor.id !== input.athleteMembershipId) {
    throw new DomainError('PERMISSION', 'Solo podés cargar tus propios datos')
  }

  const { data, error } = await supabase.rpc('create_observation_with_context', {
    p_organization_id: input.organizationId,
    p_athlete_membership_id: input.athleteMembershipId,
    p_observable_id: input.observableId,
    p_value: input.value,
    p_date: input.date ?? getTodayISO(),
    p_source_type: 'manual',
    p_created_by_membership_id: actor.id,
    p_notes: input.notes ?? null,
  })

  if (error || !data) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo guardar')

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'observation.create',
    entityType: 'observation',
    entityId: data as string,
    metadata: { observableId: input.observableId },
  })

  return { id: data as string }
}

/** Últimos registros de la organización, para mostrar en Registros. */
export async function getRecentRecords(
  organizationId: string,
  limit = 20,
  client?: AppSupabaseClient
): Promise<
  Array<{
    id: string
    athleteName: string
    observableName: string
    unitSymbol: string | null
    value: number
    date: string
  }>
> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('observations')
    .select(
      'id, value, date, source_type, observables(name, units(symbol)), memberships!observations_athlete_membership_id_fkey(people(first_name, last_name))'
    )
    .eq('organization_id', organizationId)
    .eq('source_type', 'manual')
    .is('superseded_by', null)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    athleteName: row.memberships?.people
      ? `${row.memberships.people.first_name} ${row.memberships.people.last_name}`
      : '—',
    observableName: row.observables?.name ?? '—',
    unitSymbol: row.observables?.units?.symbol ?? null,
    value: row.value,
    date: row.date,
  }))
}
