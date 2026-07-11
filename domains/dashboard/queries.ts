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
