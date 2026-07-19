import { getTodayISO } from '@/lib/today'
import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { logAudit } from '@/domains/audit/mutations'
import { calculateWaPoints } from '@/domains/performance/wa-points'

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
    waPoints?: number
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

  // Puntaje World Athletics: se calcula solo cuando hay coeficiente
  // para esa prueba/género (ver domains/performance/wa-points.ts). El
  // campo manual queda como respaldo únicamente para pruebas que
  // todavía no tienen coeficiente cargado.
  const { data: athleteRow } = await supabase
    .from('memberships')
    .select('people(gender)')
    .eq('id', input.athleteMembershipId)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gender = (athleteRow as any)?.people?.gender ?? null
  const autoPoints = await calculateWaPoints(input.observableId, gender, input.value, supabase)
  const finalPoints = autoPoints ?? input.waPoints

  if (finalPoints !== undefined && finalPoints !== null) {
    await supabase.from('observations').update({ wa_points: finalPoints }).eq('id', data as string)
  }

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
    waPoints: number | null
  }>
> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('observations')
    .select(
      'id, value, date, source_type, wa_points, observables(name, units(symbol)), memberships!observations_athlete_membership_id_fkey(people(first_name, last_name))'
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
    waPoints: row.wa_points,
  }))
}

/**
 * Corregir un registro ya cargado: marca el original como superado y
 * carga uno nuevo con el valor corregido (mismo patrón que ya usa el
 * resto de la app para correcciones — conserva el historial y hace que
 * el trigger de récords recalcule solo, porque solo dispara en INSERT).
 */
export async function editObservation(
  input: { observationId: string; organizationId: string; value: number },
  client?: AppSupabaseClient
): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor) throw new DomainError('PERMISSION', 'No autenticado')

  const { data: original, error: fetchError } = await supabase
    .from('observations')
    .select('athlete_membership_id, observable_id, date, source_type, event_id, assessment_id')
    .eq('id', input.observationId)
    .maybeSingle()

  if (fetchError || !original) throw new DomainError('NOT_FOUND', 'No se encontró el registro')

  if (actor.role === 'athlete' && actor.id !== original.athlete_membership_id) {
    throw new DomainError('PERMISSION', 'Solo podés editar lo tuyo')
  }

  const { data: newId, error } = await supabase.rpc('create_observation_with_context', {
    p_organization_id: input.organizationId,
    p_athlete_membership_id: original.athlete_membership_id,
    p_observable_id: original.observable_id,
    p_value: input.value,
    p_date: original.date,
    p_source_type: original.source_type,
    p_created_by_membership_id: actor.id,
    p_event_id: original.event_id,
  })

  if (error || !newId) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo corregir')

  await supabase.from('observations').update({ superseded_by: newId }).eq('id', input.observationId)

  const { data: athleteRow } = await supabase
    .from('memberships')
    .select('people(gender)')
    .eq('id', original.athlete_membership_id)
    .maybeSingle()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gender = (athleteRow as any)?.people?.gender ?? null
  const autoPoints = await calculateWaPoints(original.observable_id, gender, input.value, supabase)
  if (autoPoints !== null) {
    await supabase.from('observations').update({ wa_points: autoPoints }).eq('id', newId as string)
  }

  return { id: newId as string }
}

/** Elimina un registro cargado por error (no una corrección — para eso está editObservation). */
export async function deleteObservation(
  input: { observationId: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor) throw new DomainError('PERMISSION', 'No autenticado')

  const { data: original } = await supabase
    .from('observations')
    .select('athlete_membership_id, observable_id')
    .eq('id', input.observationId)
    .maybeSingle()

  if (original && actor.role === 'athlete' && actor.id !== original.athlete_membership_id) {
    throw new DomainError('PERMISSION', 'Solo podés borrar lo tuyo')
  }

  const { error } = await supabase.from('observations').delete().eq('id', input.observationId)
  if (error) throw new DomainError('CONFLICT', error.message)

  // Si lo que se borró era el récord vigente, recalculamos con lo que
  // quede (el trigger de récords solo corre en INSERT, no en DELETE).
  if (original) {
    await supabase.rpc('recalculate_personal_record', {
      p_athlete_membership_id: original.athlete_membership_id,
      p_observable_id: original.observable_id,
    })
  }
}
