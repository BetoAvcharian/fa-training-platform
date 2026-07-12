import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { logAudit } from '@/domains/audit/mutations'

export interface AnthropometryObservable {
  id: string
  name: string
  unitSymbol: string | null
  tag: 'antropometria' | 'signos_vitales'
}

export interface AnthropometryEntry {
  id: string
  observableId: string
  observableName: string
  unitSymbol: string | null
  value: number
  date: string
}

/**
 * Los 4 Observables de antropometría/signos vitales del seed global
 * (spec 5: "Salud... antropometría, signos vitales"). Se identifican por
 * tag, no por nombre hardcodeado, para que agregar uno nuevo sea una
 * fila de catálogo y no un cambio de código (spec 2.9/2.13).
 */
export async function getAnthropometryObservables(
  organizationId: string,
  client?: AppSupabaseClient
): Promise<AnthropometryObservable[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('observables')
    .select('id, name, tags, units(symbol)')
    .overlaps('tags', ['antropometria', 'signos_vitales'])
    .order('name')

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    unitSymbol: row.units?.symbol ?? null,
    tag: row.tags?.includes('antropometria') ? 'antropometria' : 'signos_vitales',
  }))
}

export async function getAnthropometryHistory(
  athleteMembershipId: string,
  client?: AppSupabaseClient
): Promise<AnthropometryEntry[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('observations')
    .select('id, observable_id, value, date, observables!inner(name, tags, units(symbol))')
    .eq('athlete_membership_id', athleteMembershipId)
    .overlaps('observables.tags', ['antropometria', 'signos_vitales'])
    .is('superseded_by', null)
    .order('date', { ascending: false })
    .limit(60)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id,
    observableId: row.observable_id,
    observableName: row.observables?.name ?? '—',
    unitSymbol: row.observables?.units?.symbol ?? null,
    value: row.value,
    date: row.date,
  }))
}

/**
 * Carga un valor de antropometría/signos vitales. El propio atleta puede
 * cargar el suyo; un coach puede cargarle uno a un atleta suyo (medición
 * en el gimnasio, por ejemplo) — RLS en observations ya lo garantiza para
 * el coach, acá solo evitamos que un atleta cargue a nombre de otro.
 */
export async function logAnthropometryValue(
  input: {
    athleteMembershipId: string
    organizationId: string
    observableId: string
    value: number
    date?: string
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
    p_date: input.date ?? new Date().toISOString().slice(0, 10),
    p_source_type: 'manual',
    p_created_by_membership_id: actor.id,
  })

  if (error || !data) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo guardar')

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'observation.create',
    entityType: 'observation',
    entityId: data as string,
    metadata: { observableId: input.observableId, kind: 'antropometria' },
  })

  return { id: data as string }
}
