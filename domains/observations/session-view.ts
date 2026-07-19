import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getEventAssignments, getSessionExercises, getExceptionMap } from '@/domains/events/queries'
import { resolveSessionForAssignment } from '@/domains/events/rules'
import type { SessionExercise } from '@/domains/events/types'

export interface ResolvedLine {
  line: SessionExercise
  executed: { value: number; date: string; notes: string | null; waPoints: number | null } | null
}

/**
 * El corazón de "Calendario modo Ver" (Fase 8.1): para un Event y un
 * atleta puntual, resuelve qué líneas le corresponden de verdad
 * (genéricas + sus excepciones, vía resolveSessionForAssignment del
 * Ticket #4) y les adjunta el dato ejecutado si ya lo completó — sin
 * esto, "planificado vs. ejecutado" sería solo una promesa de diseño,
 * no algo consultable.
 */
export async function getResolvedSessionForAthlete(
  eventId: string,
  athleteMembershipId: string,
  client?: AppSupabaseClient
): Promise<ResolvedLine[]> {
  const supabase = client ?? (await createServerClient())

  const assignments = await getEventAssignments(eventId, supabase)
  const myAssignment = assignments.find(
    (a) => a.assigneeType === 'person' && a.assigneeId === athleteMembershipId
  )

  // Si no hay asignación directa, puede ser por grupo — RLS ya filtró si
  // el atleta puede ver el Event en absoluto; acá solo determinamos qué
  // líneas de excepción (si las hay) le aplican. Sin assignment directo,
  // no hay excepciones individuales posibles para este atleta — ve todo
  // lo genérico.
  const allLines = await getSessionExercises(eventId, supabase)

  if (!myAssignment) {
    return attachExecuted(supabase, allLines, athleteMembershipId)
  }

  const exceptionMap = await getExceptionMap(eventId, supabase)
  const resolved = resolveSessionForAssignment(allLines, exceptionMap, myAssignment.id)

  return attachExecuted(supabase, resolved, athleteMembershipId)
}

async function attachExecuted(
  supabase: AppSupabaseClient,
  lines: SessionExercise[],
  athleteMembershipId: string
): Promise<ResolvedLine[]> {
  const observableIds = lines.map((l) => l.observableId).filter(Boolean) as string[]
  if (!observableIds.length) {
    return lines.map((line) => ({ line, executed: null }))
  }

  const { data: executions, error } = await supabase
    .from('observations')
    .select('observable_id, value, date, notes, wa_points')
    .eq('athlete_membership_id', athleteMembershipId)
    .eq('state', 'ejecutado')
    .is('superseded_by', null)
    .in('observable_id', observableIds)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  const byObservable = new Map((executions ?? []).map((e) => [e.observable_id, e]))

  return lines.map((line) => {
    const execution = line.observableId ? byObservable.get(line.observableId) : undefined
    return {
      line,
      executed: execution
        ? { value: execution.value, date: execution.date, notes: execution.notes, waPoints: execution.wa_points }
        : null,
    }
  })
}
