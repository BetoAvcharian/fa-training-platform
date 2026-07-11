import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from '@/domains/athletes/rules'

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
