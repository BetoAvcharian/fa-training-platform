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

export interface PlannedTrainingRow {
  date: string
  athleteName: string
  title: string
  lines: string
  feedbackStatus: string
  feedbackNotes: string
  fatiga: number | null
}

/**
 * Los entrenamientos planificados de un atleta (o todos), con lo que
 * tenían agendado ese día, si dejaron feedback y su fatiga del
 * check-in — para exportar a Excel desde Reportes.
 */
export async function getPlannedTrainingsReport(
  input: {
    organizationId: string
    athleteMembershipId?: string
    groupId?: string
    desde?: string
    hasta?: string
  },
  client?: AppSupabaseClient
): Promise<PlannedTrainingRow[]> {
  const supabase = client ?? (await createServerClient())

  let athleteIds: string[] | undefined
  if (input.athleteMembershipId) {
    athleteIds = [input.athleteMembershipId]
  } else if (input.groupId) {
    const { data: groupRows } = await supabase.from('group_memberships').select('membership_id').eq('group_id', input.groupId)
    athleteIds = (groupRows ?? []).map((r) => r.membership_id)
  }

  let eventQuery = supabase
    .from('events')
    .select('id, date, title, event_assignments(assignee_id, assignee_type)')
    .eq('organization_id', input.organizationId)
    .eq('type', 'entrenamiento')
    .eq('is_template', false)
    .order('date')

  if (input.desde) eventQuery = eventQuery.gte('date', input.desde)
  if (input.hasta) eventQuery = eventQuery.lte('date', input.hasta)

  const { data: events, error } = await eventQuery
  if (error) throw new DomainError('NOT_FOUND', error.message)
  if (!events || events.length === 0) return []

  const eventIds = events.map((e) => e.id)
  const allAssigneeIds = Array.from(
    new Set(
      events.flatMap((e) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((e as any).event_assignments ?? []).filter((a: any) => a.assignee_type === 'person').map((a: any) => a.assignee_id as string)
      )
    )
  )
  const relevantAthleteIds = athleteIds ? allAssigneeIds.filter((id) => athleteIds!.includes(id)) : allAssigneeIds

  const [{ data: people }, { data: lines }, { data: feedbackRows }, { data: checkinRows }] = await Promise.all([
    supabase.from('memberships').select('id, people(first_name, last_name)').in('id', relevantAthleteIds),
    supabase.from('session_exercises').select('event_id, raw_text, order_index').in('event_id', eventIds).order('order_index'),
    supabase.from('session_feedback').select('event_id, athlete_membership_id, status, notes').in('event_id', eventIds),
    supabase
      .from('observations')
      .select('athlete_membership_id, date, value, observables(name)')
      .eq('organization_id', input.organizationId)
      .eq('source_type', 'checkin')
      .is('superseded_by', null)
      .in('athlete_membership_id', relevantAthleteIds),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nameById = new Map((people ?? []).map((p: any) => [p.id, p.people ? `${p.people.first_name} ${p.people.last_name}` : '—']))

  const linesByEvent = new Map<string, string[]>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (lines ?? []) as any[]) {
    const list = linesByEvent.get(row.event_id) ?? []
    list.push(row.raw_text)
    linesByEvent.set(row.event_id, list)
  }

  const feedbackByEventAthlete = new Map<string, { status: string; notes: string | null }>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (feedbackRows ?? []) as any[]) {
    feedbackByEventAthlete.set(`${row.event_id}:${row.athlete_membership_id}`, { status: row.status, notes: row.notes })
  }

  const fatigaByAthleteDate = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (checkinRows ?? []) as any[]) {
    if (row.observables?.name === 'Fatiga') fatigaByAthleteDate.set(`${row.athlete_membership_id}:${row.date}`, row.value)
  }

  const result: PlannedTrainingRow[] = []
  for (const event of events) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignedIds = ((event as any).event_assignments ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((a: any) => a.assignee_type === 'person')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((a: any) => a.assignee_id as string)
      .filter((id: string) => relevantAthleteIds.includes(id))

    for (const athleteId of assignedIds) {
      const fb = feedbackByEventAthlete.get(`${event.id}:${athleteId}`)
      result.push({
        date: event.date as string,
        athleteName: nameById.get(athleteId) ?? '—',
        title: event.title as string,
        lines: (linesByEvent.get(event.id) ?? []).join(' | '),
        feedbackStatus: fb ? fb.status : 'sin cargar',
        feedbackNotes: fb?.notes ?? '',
        fatiga: fatigaByAthleteDate.get(`${athleteId}:${event.date}`) ?? null,
      })
    }
  }

  return result.sort((a, b) => a.date.localeCompare(b.date) || a.athleteName.localeCompare(b.athleteName, 'es'))
}
