import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from '@/domains/athletes/rules'
import { logAudit } from '@/domains/audit/mutations'

/**
 * Check-in diario — NO bloqueante (Fase 8.3, decisión explícita: el
 * atleta puede entrenar sin cargar esto). Energía/Fatiga/Molestia son
 * Observables como cualquier otro — se guardan como Observation con
 * source_type='checkin', sin event_id (es del día, no de una sesión
 * puntual — Fase 8.3, source_ref queda null a propósito).
 *
 * La AUSENCIA de check-in en una fecha es información en sí misma (no
 * hay fila) — es lo que va a alimentar la alerta "no cargó bienestar en
 * 3 días" del futuro Dashboard, sin necesitar un campo de "completado".
 */
export async function submitCheckin(
  input: {
    organizationId: string
    athleteMembershipId: string
    date: string
    energia?: number
    fatiga?: number
    molestia?: number
  },
  client?: AppSupabaseClient
) {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['athlete'], supabase)

  if (actor.id !== input.athleteMembershipId) {
    throw new DomainError('PERMISSION', 'Solo podés cargar tu propio check-in')
  }

  const { data: observables, error: obsError } = await supabase
    .from('observables')
    .select('id, name')
    .in('name', ['Energía', 'Fatiga', 'Molestia'])
    .is('organization_id', null)

  if (obsError || !observables?.length) {
    throw new DomainError('NOT_FOUND', 'No se encontraron los Observables de check-in en el catálogo')
  }

  const byName = new Map(observables.map((o) => [o.name, o.id]))
  const entries: Array<{ observableId: string; value: number }> = []
  if (input.energia !== undefined) entries.push({ observableId: byName.get('Energía')!, value: input.energia })
  if (input.fatiga !== undefined) entries.push({ observableId: byName.get('Fatiga')!, value: input.fatiga })
  if (input.molestia !== undefined) entries.push({ observableId: byName.get('Molestia')!, value: input.molestia })

  if (!entries.length) {
    throw new DomainError('VALIDATION', 'El check-in necesita al menos un valor (energía, fatiga o molestia)')
  }

  const insertedIds: string[] = []
  for (const entry of entries) {
    // Un solo check-in vigente por día y por variable — si ya había uno
    // hoy, se marca superado antes de cargar el nuevo (mismo mecanismo
    // que usa editObservation para corregir una marca).
    const { data: previous } = await supabase
      .from('observations')
      .select('id')
      .eq('athlete_membership_id', input.athleteMembershipId)
      .eq('observable_id', entry.observableId)
      .eq('date', input.date)
      .eq('source_type', 'checkin')
      .is('superseded_by', null)
      .maybeSingle()

    const { data: id, error } = await supabase.rpc('create_observation_with_context', {
      p_organization_id: input.organizationId,
      p_athlete_membership_id: input.athleteMembershipId,
      p_observable_id: entry.observableId,
      p_value: entry.value,
      p_date: input.date,
      p_source_type: 'checkin',
      p_created_by_membership_id: actor.id,
    })
    if (error || !id) {
      throw new DomainError('CONFLICT', error?.message ?? 'No se pudo guardar el check-in')
    }

    if (previous) {
      await supabase.from('observations').update({ superseded_by: id }).eq('id', previous.id)
    }

    insertedIds.push(id as string)
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'observation.create',
    entityType: 'observation',
    entityId: insertedIds[0],
    metadata: { checkin: true, date: input.date, fields: entries.map((e) => e.observableId) },
  })

  return { ids: insertedIds }
}

/** Valores reales del check-in de esta fecha (o null si no cargó nada) — para que el formulario recuerde lo que ya guardaste. */
export async function getCheckinForDate(
  athleteMembershipId: string,
  date: string,
  client?: AppSupabaseClient
): Promise<{ energia: number | null; fatiga: number | null; molestia: number | null }> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('observations')
    .select('value, observables(name)')
    .eq('athlete_membership_id', athleteMembershipId)
    .eq('date', date)
    .eq('source_type', 'checkin')
    .is('superseded_by', null)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  const byName = (name: string) => rows.find((r) => r.observables?.name === name)?.value ?? null

  return {
    energia: byName('Energía'),
    fatiga: byName('Fatiga'),
    molestia: byName('Molestia'),
  }
}

/** ¿Este atleta ya cargó check-in hoy (o en la fecha dada)? Base de la alerta de "sin bienestar cargado". */
export async function hasCheckinForDate(
  athleteMembershipId: string,
  date: string,
  client?: AppSupabaseClient
): Promise<boolean> {
  const supabase = client ?? (await createServerClient())
  const { count, error } = await supabase
    .from('observations')
    .select('id', { count: 'exact', head: true })
    .eq('athlete_membership_id', athleteMembershipId)
    .eq('date', date)
    .eq('source_type', 'checkin')

  if (error) throw new DomainError('NOT_FOUND', error.message)
  return (count ?? 0) > 0
}

export interface AthleteCheckinToday {
  athleteMembershipId: string
  athleteName: string
  energia: number | null
  fatiga: number | null
  molestia: number | null
}

/**
 * Check-in de HOY (o la fecha dada) de todos los atletas del org,
 * ordenado por energía ascendente — para la tarjeta "menor energía"
 * del Dashboard del coach. Solo trae a quienes SÍ cargaron algo ese
 * día (la ausencia se trata aparte, no es "energía 0").
 */
export async function getLowestEnergyToday(
  organizationId: string,
  date: string,
  limit?: number,
  client?: AppSupabaseClient
): Promise<AthleteCheckinToday[]> {
  const supabase = client ?? (await createServerClient())

  const { data, error } = await supabase
    .from('observations')
    .select('athlete_membership_id, value, observables(name), memberships!observations_athlete_membership_id_fkey(people(first_name, last_name))')
    .eq('organization_id', organizationId)
    .eq('date', date)
    .eq('source_type', 'checkin')
    .is('superseded_by', null)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[]
  const byAthlete = new Map<string, AthleteCheckinToday>()

  for (const row of rows) {
    const id = row.athlete_membership_id
    if (!byAthlete.has(id)) {
      const person = row.memberships?.people
      byAthlete.set(id, {
        athleteMembershipId: id,
        athleteName: person ? `${person.first_name} ${person.last_name}` : '—',
        energia: null,
        fatiga: null,
        molestia: null,
      })
    }
    const entry = byAthlete.get(id)!
    const obsName = row.observables?.name
    if (obsName === 'Energía') entry.energia = row.value
    else if (obsName === 'Fatiga') entry.fatiga = row.value
    else if (obsName === 'Molestia') entry.molestia = row.value
  }

  const list = Array.from(byAthlete.values())
    .filter((a) => a.energia !== null)
    .sort((a, b) => (a.energia ?? 99) - (b.energia ?? 99))

  return limit ? list.slice(0, limit) : list
}
