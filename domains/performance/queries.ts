import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from '@/domains/athletes/rules'
import { getMyActiveMembership } from '@/domains/athletes/queries'

export interface MyRecord {
  id: string
  observableId: string
  observableName: string
  unitSymbol: string | null
  higherIsBetter: boolean
  recordType: 'oficial' | 'entrenamiento'
  value: number
  achievedDate: string
}

export interface MyResultRow {
  id: string
  observableId: string
  observableName: string
  unitSymbol: string | null
  value: number
  date: string
  sourceType: string
  validationStatus: string
  wasCorrected: boolean
}

/**
 * Récords del atleta autenticado (oficial + entrenamiento) — 100% derivado,
 * lee directo de `personal_records` (nunca se calcula acá, ver spec 3.4:
 * la tabla la mantiene el trigger de la base).
 */
export async function getMyRecords(client?: AppSupabaseClient): Promise<MyRecord[]> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  const { data, error } = await supabase
    .from('personal_records')
    .select('id, observable_id, record_type, value, achieved_date, observables(name, higher_is_better, units(symbol))')
    .eq('athlete_membership_id', membership.id)
    .order('achieved_date', { ascending: false })

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    observableId: row.observable_id,
    observableName: row.observables?.name ?? '—',
    unitSymbol: row.observables?.units?.symbol ?? null,
    higherIsBetter: row.observables?.higher_is_better ?? false,
    recordType: row.record_type,
    value: row.value,
    achievedDate: row.achieved_date,
  }))
}

/**
 * Todos los resultados de rendimiento del atleta autenticado — fusiona
 * tests y competencias, diferenciados por `source_type` (spec 5, pantalla
 * Rendimiento: "tabla única que fusiona tests y competencias"). Solo
 * ejecutadas y vigentes (`state = 'ejecutado'`, `superseded_by is null`);
 * las corregidas se marcan vía `wasCorrected` mirando si algo las
 * reemplazó en algún momento (join contra sí misma por el lado inverso
 * no aplica acá porque ya filtramos por vigente — wasCorrected queda
 * para una futura vista de historial completo).
 */
export async function getMyResults(
  limit = 50,
  client?: AppSupabaseClient
): Promise<MyResultRow[]> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) throw new DomainError('PERMISSION', 'No autenticado')

  const { data, error } = await supabase
    .from('observations')
    .select(
      'id, observable_id, value, date, source_type, validation_status, observables!inner(name, is_performance, units(symbol))'
    )
    .eq('athlete_membership_id', membership.id)
    .eq('state', 'ejecutado')
    .eq('observables.is_performance', true)
    .is('superseded_by', null)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    observableId: row.observable_id,
    observableName: row.observables?.name ?? '—',
    unitSymbol: row.observables?.units?.symbol ?? null,
    value: row.value,
    date: row.date,
    sourceType: row.source_type,
    validationStatus: row.validation_status,
    wasCorrected: false,
  }))
}

export interface AthleteSeries {
  athleteMembershipId: string
  athleteName: string
  points: Array<{ date: string; value: number }>
}

/**
 * Comparar varios atletas en un mismo Observable — SOLO entrenador/manager
 * (Fase 8.4, decisión explícita: "el atleta debe ver su propia evolución
 * pero no necesariamente comparar contra otros"). No es una tabla nueva,
 * es N series de getProgressionSeries juntas.
 */
export async function compareAthletes(
  input: { organizationId: string; athleteMembershipIds: string[]; observableId: string; from?: string; to?: string },
  client?: AppSupabaseClient
): Promise<AthleteSeries[]> {
  const supabase = client ?? (await createServerClient())
  await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  if (input.athleteMembershipIds.length < 2) {
    throw new DomainError('VALIDATION', 'Hacen falta al menos 2 atletas para comparar')
  }

  const { data: people, error: peopleError } = await supabase
    .from('memberships')
    .select('id, people(first_name, last_name)')
    .in('id', input.athleteMembershipIds)

  if (peopleError) throw new DomainError('NOT_FOUND', peopleError.message)

  const results: AthleteSeries[] = []
  for (const athleteMembershipId of input.athleteMembershipIds) {
    const { data: observations, error } = await supabase
      .from('observations')
      .select('date, value')
      .eq('athlete_membership_id', athleteMembershipId)
      .eq('observable_id', input.observableId)
      .eq('state', 'ejecutado')
      .is('superseded_by', null)
      .order('date')

    if (error) throw new DomainError('NOT_FOUND', error.message)

    let points = observations ?? []
    if (input.from) points = points.filter((p) => p.date >= input.from!)
    if (input.to) points = points.filter((p) => p.date <= input.to!)

    const person = people?.find((p) => p.id === athleteMembershipId)
    const personData = (person as any)?.people

    results.push({
      athleteMembershipId,
      athleteName: personData ? `${personData.first_name} ${personData.last_name}` : '—',
      points,
    })
  }

  return results
}

/** Promedio grupal por fecha, entre los mismos atletas — Fase 8.4 ("ver promedio grupal"). */
export function computeGroupAverage(series: AthleteSeries[]): Array<{ date: string; average: number }> {
  const byDate = new Map<string, number[]>()
  for (const athlete of series) {
    for (const point of athlete.points) {
      const list = byDate.get(point.date) ?? []
      list.push(point.value)
      byDate.set(point.date, list)
    }
  }

  return Array.from(byDate.entries())
    .map(([date, values]) => ({ date, average: values.reduce((a, b) => a + b, 0) / values.length }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
