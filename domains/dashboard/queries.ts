import { getTodayISO } from '@/lib/today'
import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'

/**
 * Ninguna función de este archivo agrega una tabla nueva — el Dashboard
 * es una lente sobre Membership/Observation/Event que ya existen (Fase 7:
 * "no organizar según la base de datos, organizar según cómo piensa un
 * entrenador"). Cada alerta es una consulta, no un dato guardado.
 *
 * Alertas NO incluidas todavía, documentado explícito: lesiones activas
 * (necesita HealthEpisode, no construido) y carga aguda/crónica (ACWR,
 * necesita Metric + job asíncrono, Fase 10/11 — deliberadamente pospuesto
 * hasta que haya volumen real que lo justifique).
 */

function daysAgoISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export interface OrgStatCard {
  count: number
  deltaWeek: number
}

/** Las 4 métricas de cabecera del dashboard: ejercicios, sesiones, atletas, miembros activos. */
export async function getOrgStats(
  organizationId: string,
  client?: AppSupabaseClient
): Promise<{ drills: OrgStatCard; sessions: OrgStatCard; athletes: OrgStatCard; activeMembers: OrgStatCard }> {
  const supabase = client ?? (await createServerClient())
  const weekAgo = daysAgoISO(7)

  const [drills, drillsWeek, sessions, sessionsWeek, athletes, athletesWeek, activeMembers, activeMembersWeek] =
    await Promise.all([
      supabase.from('observables').select('id', { count: 'exact', head: true }),
      supabase.from('observables').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('type', 'entrenamiento'),
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('type', 'entrenamiento')
        .gte('created_at', weekAgo),
      supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('role', 'athlete'),
      supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('role', 'athlete')
        .gte('created_at', weekAgo),
      supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'activo'),
      supabase
        .from('memberships')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'activo')
        .gte('created_at', weekAgo),
    ])

  return {
    drills: { count: drills.count ?? 0, deltaWeek: drillsWeek.count ?? 0 },
    sessions: { count: sessions.count ?? 0, deltaWeek: sessionsWeek.count ?? 0 },
    athletes: { count: athletes.count ?? 0, deltaWeek: athletesWeek.count ?? 0 },
    activeMembers: { count: activeMembers.count ?? 0, deltaWeek: activeMembersWeek.count ?? 0 },
  }
}

/** Próximos eventos de toda la organización (no solo los de un coach), con asignados/completados. */
export async function getUpcomingEventsOrg(
  organizationId: string,
  limit = 5,
  client?: AppSupabaseClient
): Promise<
  Array<{ id: string; title: string; type: string; date: string; assignedCount: number; completedCount: number }>
> {
  const supabase = client ?? (await createServerClient())
  const today = getTodayISO()

  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, type, date, event_assignments(assignee_id, assignee_type)')
    .eq('organization_id', organizationId)
    .eq('is_template', false)
    .gte('date', today)
    .order('date')
    .limit(limit)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  const results = await Promise.all(
    (events ?? []).map(async (event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assignees = ((event as any).event_assignments ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((a: any) => a.assignee_type === 'person')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a: any) => a.assignee_id as string)

      let completedCount = 0
      if (assignees.length > 0) {
        const { count } = await supabase
          .from('observations')
          .select('athlete_membership_id', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('state', 'ejecutado')
          .in('athlete_membership_id', assignees)

        completedCount = count ?? 0
      }

      return {
        id: event.id,
        title: event.title,
        type: event.type,
        date: event.date as string,
        assignedCount: assignees.length,
        completedCount,
      }
    })
  )

  return results
}

/** Asistencia (asignados vs. completados) de las últimas N sesiones de entrenamiento de la org. */
export async function getAttendanceSeries(
  organizationId: string,
  limit = 10,
  client?: AppSupabaseClient
): Promise<Array<{ date: string; assigned: number; completed: number }>> {
  const supabase = client ?? (await createServerClient())
  const today = getTodayISO()

  const { data: events, error } = await supabase
    .from('events')
    .select('id, date, event_assignments(assignee_id, assignee_type)')
    .eq('organization_id', organizationId)
    .eq('type', 'entrenamiento')
    .eq('is_template', false)
    .lte('date', today)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  const series = await Promise.all(
    (events ?? []).reverse().map(async (event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assignees = ((event as any).event_assignments ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((a: any) => a.assignee_type === 'person')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a: any) => a.assignee_id as string)

      let completed = 0
      if (assignees.length > 0) {
        const { count } = await supabase
          .from('observations')
          .select('athlete_membership_id', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('state', 'ejecutado')
          .in('athlete_membership_id', assignees)
        completed = count ?? 0
      }

      return { date: event.date as string, assigned: assignees.length, completed }
    })
  )

  return series
}

export interface AthleteAlert {
  athleteMembershipId: string
  athleteName: string
}

/** 🔴 Atención requerida: atletas de este coach sin ninguna ejecución desde `sinceDate`. */
export async function getAthletesWithoutExecutionSince(
  coachMembershipId: string,
  sinceDate: string,
  client?: AppSupabaseClient
): Promise<AthleteAlert[]> {
  const supabase = client ?? (await createServerClient())

  const { data: athletes, error: athletesError } = await supabase
    .from('memberships')
    .select('id, people(first_name, last_name)')
    .eq('coach_membership_id', coachMembershipId)
    .eq('role', 'athlete')
    .eq('status', 'activo')

  if (athletesError) throw new DomainError('NOT_FOUND', athletesError.message)
  if (!athletes?.length) return []

  const athleteIds = athletes.map((a) => a.id)

  const { data: recentExecutions, error: execError } = await supabase
    .from('observations')
    .select('athlete_membership_id')
    .in('athlete_membership_id', athleteIds)
    .eq('state', 'ejecutado')
    .gte('date', sinceDate)

  if (execError) throw new DomainError('NOT_FOUND', execError.message)

  const withRecentExecution = new Set((recentExecutions ?? []).map((e) => e.athlete_membership_id))

  return athletes
    .filter((a) => !withRecentExecution.has(a.id))
    .map((a) => ({
      athleteMembershipId: a.id,
      athleteName: formatName((a as any).people),
    }))
}

/** 🟠 Seguimiento: energía baja o fatiga alta en el check-in de una fecha puntual (por defecto, hoy). */
export async function getWellnessAlerts(
  coachMembershipId: string,
  date: string,
  thresholds: { lowEnergy?: number; highFatigue?: number } = {},
  client?: AppSupabaseClient
): Promise<Array<AthleteAlert & { energia: number | null; fatiga: number | null }>> {
  const supabase = client ?? (await createServerClient())
  const lowEnergy = thresholds.lowEnergy ?? 2
  const highFatigue = thresholds.highFatigue ?? 4

  const { data: athletes, error: athletesError } = await supabase
    .from('memberships')
    .select('id, people(first_name, last_name)')
    .eq('coach_membership_id', coachMembershipId)
    .eq('role', 'athlete')
    .eq('status', 'activo')

  if (athletesError) throw new DomainError('NOT_FOUND', athletesError.message)
  if (!athletes?.length) return []

  const athleteIds = athletes.map((a) => a.id)

  const { data: observables } = await supabase.from('observables').select('id, name').in('name', ['Energía', 'Fatiga'])
  const energiaId = observables?.find((o) => o.name === 'Energía')?.id
  const fatigaId = observables?.find((o) => o.name === 'Fatiga')?.id

  const { data: checkins, error: checkinError } = await supabase
    .from('observations')
    .select('athlete_membership_id, observable_id, value')
    .in('athlete_membership_id', athleteIds)
    .eq('date', date)
    .eq('source_type', 'checkin')
    .is('superseded_by', null)

  if (checkinError) throw new DomainError('NOT_FOUND', checkinError.message)

  const byAthlete = new Map<string, { energia: number | null; fatiga: number | null }>()
  for (const c of checkins ?? []) {
    const entry = byAthlete.get(c.athlete_membership_id) ?? { energia: null, fatiga: null }
    if (c.observable_id === energiaId) entry.energia = c.value
    if (c.observable_id === fatigaId) entry.fatiga = c.value
    byAthlete.set(c.athlete_membership_id, entry)
  }

  const alerts: Array<AthleteAlert & { energia: number | null; fatiga: number | null }> = []
  for (const athlete of athletes) {
    const wellness = byAthlete.get(athlete.id)
    if (!wellness) continue // sin check-in ese día -> no es esta alerta (es la de "sin registrar")
    const isLow = wellness.energia !== null && wellness.energia <= lowEnergy
    const isHigh = wellness.fatiga !== null && wellness.fatiga >= highFatigue
    if (isLow || isHigh) {
      alerts.push({ athleteMembershipId: athlete.id, athleteName: formatName((athlete as any).people), ...wellness })
    }
  }
  return alerts
}

/** ℹ️ Información: competencias de los atletas de este coach dentro de los próximos N días. */
export async function getUpcomingCompetitions(
  coachMembershipId: string,
  fromDate: string,
  toDate: string,
  client?: AppSupabaseClient
): Promise<Array<{ eventId: string; title: string; date: string; athleteName: string }>> {
  const supabase = client ?? (await createServerClient())

  // Dos pasos, a propósito: un filtro anidado de dos niveles
  // (event_assignments.memberships.coach_membership_id) no es confiable
  // en PostgREST — se resuelve primero quiénes son mis atletas, después
  // se filtra por esos IDs directo, sin anidar más de un nivel.
  const { data: myAthletes, error: athletesError } = await supabase
    .from('memberships')
    .select('id, people(first_name, last_name)')
    .eq('coach_membership_id', coachMembershipId)
    .eq('role', 'athlete')

  if (athletesError) throw new DomainError('NOT_FOUND', athletesError.message)
  if (!myAthletes?.length) return []

  const athleteIds = myAthletes.map((a) => a.id)
  const nameById = new Map(myAthletes.map((a) => [a.id, formatName((a as any).people)]))

  const { data: assignments, error: assignError } = await supabase
    .from('event_assignments')
    .select('event_id, assignee_id, events!inner(title, date, type)')
    .eq('assignee_type', 'person')
    .in('assignee_id', athleteIds)
    .eq('events.type', 'competencia')
    .gte('events.date', fromDate)
    .lte('events.date', toDate)

  if (assignError) throw new DomainError('NOT_FOUND', assignError.message)

  return (assignments ?? []).map((a: any) => ({
    eventId: a.event_id,
    title: a.events.title,
    date: a.events.date,
    athleteName: nameById.get(a.assignee_id) ?? '—',
  }))
}

/** Resumen de hoy: asignados vs. completados, para el bloque "Hoy" del Dashboard. */
export async function getTodaySummary(
  coachMembershipId: string,
  date: string,
  client?: AppSupabaseClient
): Promise<{ assigned: number; completed: number }> {
  const supabase = client ?? (await createServerClient())

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, event_assignments(assignee_id, assignee_type)')
    .eq('type', 'entrenamiento')
    .eq('date', date)
    .eq('created_by_membership_id', coachMembershipId)

  if (eventsError) throw new DomainError('NOT_FOUND', eventsError.message)

  const assignedAthletes = new Set<string>()
  for (const event of events ?? []) {
    for (const ea of (event as any).event_assignments ?? []) {
      if (ea.assignee_type === 'person') assignedAthletes.add(ea.assignee_id)
    }
  }

  if (!assignedAthletes.size) return { assigned: 0, completed: 0 }

  const { data: executions, error: execError } = await supabase
    .from('observations')
    .select('athlete_membership_id')
    .in('athlete_membership_id', Array.from(assignedAthletes))
    .eq('date', date)
    .eq('state', 'ejecutado')

  if (execError) throw new DomainError('NOT_FOUND', execError.message)

  const completed = new Set((executions ?? []).map((e) => e.athlete_membership_id))

  return { assigned: assignedAthletes.size, completed: completed.size }
}

function formatName(person: { first_name?: string; last_name?: string } | null | undefined): string {
  if (!person) return '—'
  return `${person.first_name ?? ''} ${person.last_name ?? ''}`.trim()
}

/**
 * Cuántos atletas asignados dejaron feedback (de cualquier tipo —
 * completado, con observación o no completado, no importa cuál) en
 * cada uno de los últimos entrenamientos — mucho más entendible para
 * el entrenador que "% con marca concreta registrada", que mezclaba
 * dos sistemas distintos. Reemplaza al gráfico de rendimiento en el
 * Dashboard.
 */
export async function getFeedbackRateSeries(
  organizationId: string,
  limit = 10,
  client?: AppSupabaseClient
): Promise<Array<{ date: string; assigned: number; completed: number }>> {
  const supabase = client ?? (await createServerClient())
  const today = getTodayISO()

  const { data: events, error } = await supabase
    .from('events')
    .select('id, date, event_assignments(assignee_id, assignee_type)')
    .eq('organization_id', organizationId)
    .eq('type', 'entrenamiento')
    .eq('is_template', false)
    .lte('date', today)
    .order('date', { ascending: false })
    .limit(limit)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  const series = await Promise.all(
    (events ?? []).reverse().map(async (event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assignees = ((event as any).event_assignments ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((a: any) => a.assignee_type === 'person')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a: any) => a.assignee_id as string)

      let withFeedback = 0
      if (assignees.length > 0) {
        const { count } = await supabase
          .from('session_feedback')
          .select('athlete_membership_id', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .in('athlete_membership_id', assignees)
        withFeedback = count ?? 0
      }

      return { date: event.date as string, assigned: assignees.length, completed: withFeedback }
    })
  )

  return series
}
