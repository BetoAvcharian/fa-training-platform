import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'

export interface Competition {
  id: string
  title: string
  date: string | null
  location: string | null
  locationMapUrl: string | null
  createdByMembershipId: string
}

export async function getCompetitions(organizationId: string, client?: AppSupabaseClient): Promise<Competition[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('events')
    .select('id, title, date, location, location_map_url, created_by_membership_id')
    .eq('organization_id', organizationId)
    .eq('type', 'competencia')
    .eq('is_template', false)
    .order('date', { ascending: false })

  if (error) throw new DomainError('NOT_FOUND', error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    location: row.location,
    locationMapUrl: row.location_map_url,
    createdByMembershipId: row.created_by_membership_id,
  }))
}

export interface CompetitionEntry {
  athleteMembershipId: string
  athleteName: string
  results: Array<{ id: string; observableName: string; unitSymbol: string | null; value: number; windMs: number | null }>
}

/** Inscriptos en la competencia, con sus resultados ya cargados (si los hay). */
export async function getCompetitionEntries(
  eventId: string,
  client?: AppSupabaseClient
): Promise<CompetitionEntry[]> {
  const supabase = client ?? (await createServerClient())

  const { data: assignments, error: assignError } = await supabase
    .from('event_assignments')
    .select('assignee_id')
    .eq('event_id', eventId)
    .eq('assignee_type', 'person')

  if (assignError) throw new DomainError('NOT_FOUND', assignError.message)

  const athleteIds = (assignments ?? []).map((a) => a.assignee_id as string)

  const { data: people, error: peopleError } = await supabase
    .from('memberships')
    .select('id, people(first_name, last_name)')
    .in('id', athleteIds.length > 0 ? athleteIds : ['00000000-0000-0000-0000-000000000000'])

  if (peopleError) throw new DomainError('NOT_FOUND', peopleError.message)

  const { data: observations, error: obsError } = await supabase
    .from('observations')
    .select('id, athlete_membership_id, value, wind_ms, observables(name, units(symbol))')
    .eq('event_id', eventId)
    .eq('state', 'ejecutado')
    .is('superseded_by', null)

  if (obsError) throw new DomainError('NOT_FOUND', obsError.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return athleteIds.map((athleteMembershipId) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const person = (people ?? []).find((p: any) => p.id === athleteMembershipId) as any
    const personData = person?.people
    const results = (observations ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((o: any) => o.athlete_membership_id === athleteMembershipId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((o: any) => ({
        id: o.id,
        observableName: o.observables?.name ?? '—',
        unitSymbol: o.observables?.units?.symbol ?? null,
        value: o.value,
        windMs: o.wind_ms,
      }))

    return {
      athleteMembershipId,
      athleteName: personData ? `${personData.first_name} ${personData.last_name}` : '—',
      results,
    }
  })
}
