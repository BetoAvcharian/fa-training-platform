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
