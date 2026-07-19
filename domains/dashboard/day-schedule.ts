import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getFeedbackForEvent } from '@/domains/observations/session-feedback'
import type { DayTraining, AthleteFeedbackRow } from '@/components/ui/training-day-list'

/**
 * Todo lo que hace falta para la vista "por día" del entrenador:
 * los entrenamientos/competencias de esa fecha, con el detalle de
 * cada línea, el feedback de cada atleta asignado (verde/amarillo/
 * blanco) y su energía del check-in de ese mismo día. Se usa tanto
 * en Calendario (vista día completa) como en el mini-resumen del
 * Dashboard.
 */
export async function getDaySchedule(
  organizationId: string,
  date: string,
  client?: AppSupabaseClient
): Promise<DayTraining[]> {
  const supabase = client ?? (await createServerClient())

  const { data: events, error } = await supabase
    .from('events')
    .select('id, type, title, location')
    .eq('organization_id', organizationId)
    .eq('is_template', false)
    .eq('date', date)
    .in('type', ['entrenamiento', 'competencia'])
    .order('created_at')

  if (error) throw new DomainError('NOT_FOUND', error.message)
  if (!events || events.length === 0) return []

  const eventIds = events.map((e) => e.id)

  const [{ data: assignments }, { data: lines }, { data: checkinRows }] = await Promise.all([
    supabase.from('event_assignments').select('event_id, assignee_id').in('event_id', eventIds).eq('assignee_type', 'person'),
    supabase.from('session_exercises').select('event_id, raw_text, order_index').in('event_id', eventIds).order('order_index'),
    supabase
      .from('observations')
      .select('athlete_membership_id, value, observables(name)')
      .eq('organization_id', organizationId)
      .eq('date', date)
      .eq('source_type', 'checkin')
      .is('superseded_by', null),
  ])

  const energiaByAthlete = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (checkinRows ?? []) as any[]) {
    if (row.observables?.name === 'Energía') energiaByAthlete.set(row.athlete_membership_id, row.value)
  }

  const assignedByEvent = new Map<string, string[]>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (assignments ?? []) as any[]) {
    const list = assignedByEvent.get(row.event_id) ?? []
    list.push(row.assignee_id)
    assignedByEvent.set(row.event_id, list)
  }

  const linesByEvent = new Map<string, string[]>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (lines ?? []) as any[]) {
    const list = linesByEvent.get(row.event_id) ?? []
    list.push(row.raw_text)
    linesByEvent.set(row.event_id, list)
  }

  const result: DayTraining[] = await Promise.all(
    events.map(async (event) => {
      const assigned = assignedByEvent.get(event.id) ?? []
      const feedback: AthleteFeedbackRow[] =
        assigned.length > 0
          ? (await getFeedbackForEvent(event.id, assigned, supabase)).map((f) => ({
              ...f,
              energia: energiaByAthlete.get(f.athleteMembershipId) ?? null,
            }))
          : []

      return {
        id: event.id,
        title: event.title,
        type: event.type,
        location: event.location,
        lines: linesByEvent.get(event.id) ?? [],
        feedback,
      }
    })
  )

  return result
}
