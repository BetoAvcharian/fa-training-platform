import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'

export interface ReportRow {
  date: string
  athleteName: string
  observableName: string
  sport: string
  value: number
  unitSymbol: string | null
  sourceType: string
  validationStatus: string
}

export interface ReportFilters {
  organizationId: string
  athleteMembershipId?: string
  groupId?: string
  desde?: string
  hasta?: string
  sourceType?: string
}

/**
 * Todos los registros de rendimiento de la organización, con nombres
 * resueltos — pensado para exportar, no para renderizar en pantalla
 * (por eso no pagina). Filtros opcionales por atleta, grupo, rango de
 * fechas y tipo de origen.
 */
export async function getReportData(filters: ReportFilters, client?: AppSupabaseClient): Promise<ReportRow[]> {
  const supabase = client ?? (await createServerClient())

  let athleteIds: string[] | null = null
  if (filters.groupId) {
    const { data: members } = await supabase
      .from('group_memberships')
      .select('membership_id')
      .eq('group_id', filters.groupId)
    athleteIds = (members ?? []).map((m) => m.membership_id as string)
  }

  let query = supabase
    .from('observations')
    .select(
      'date, value, source_type, validation_status, athlete_membership_id, observables(name, sports(name), units(symbol))'
    )
    .eq('organization_id', filters.organizationId)
    .eq('state', 'ejecutado')
    .is('superseded_by', null)
    .order('date', { ascending: false })

  if (filters.athleteMembershipId) query = query.eq('athlete_membership_id', filters.athleteMembershipId)
  if (athleteIds) query = query.in('athlete_membership_id', athleteIds)
  if (filters.desde) query = query.gte('date', filters.desde)
  if (filters.hasta) query = query.lte('date', filters.hasta)
  if (filters.sourceType) query = query.eq('source_type', filters.sourceType)

  const { data, error } = await query
  if (error) throw new DomainError('NOT_FOUND', error.message)

  const athleteMembershipIds = Array.from(new Set((data ?? []).map((r) => r.athlete_membership_id as string)))
  const { data: people } = await supabase
    .from('memberships')
    .select('id, people(first_name, last_name)')
    .in('id', athleteMembershipIds.length > 0 ? athleteMembershipIds : ['00000000-0000-0000-0000-000000000000'])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nameById = new Map((people ?? []).map((p: any) => [p.id, p.people ? `${p.people.first_name} ${p.people.last_name}` : '—']))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    date: row.date,
    athleteName: nameById.get(row.athlete_membership_id) ?? '—',
    observableName: row.observables?.name ?? '—',
    sport: row.observables?.sports?.name ?? '—',
    value: row.value,
    unitSymbol: row.observables?.units?.symbol ?? null,
    sourceType: row.source_type,
    validationStatus: row.validation_status,
  }))
}
