import { getEventAssignments, getSessionExercises } from '@/domains/events/queries'
import { getObservationsForEvent } from '@/domains/observations/queries'
import { getPrimaryValue } from '@/domains/events/rules'
import type { Event } from '@/domains/events/types'
import type { AthleteSessionFeedback } from '@/domains/observations/session-feedback'

interface RosterEntry {
  id: string
  person: { firstName: string; lastName: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  completado: 'Completado',
  completado_con_observacion: 'Con observación',
  no_completado: 'No completado',
}

function statusDot(status: string | null) {
  if (status === 'completado') return 'bg-status-positive'
  if (status === 'completado_con_observacion') return 'bg-status-attention'
  if (status === 'no_completado') return 'bg-status-critical'
  return 'bg-outline border border-status-neutral/40'
}

export async function EventCompareCard({
  event,
  roster,
  feedback,
}: {
  event: Event
  roster: RosterEntry[]
  feedback: AthleteSessionFeedback[]
}) {
  const [assignments, lines, observations] = await Promise.all([
    getEventAssignments(event.id),
    getSessionExercises(event.id),
    getObservationsForEvent(event.id),
  ])

  const feedbackByAthlete = new Map(feedback.map((f) => [f.athleteMembershipId, f]))

  const structuredLines = lines.filter((l) => l.isStructured && l.observableId)
  const athleteIds = assignments.filter((a) => a.assigneeType === 'person').map((a) => a.assigneeId)
  const rosterById = new Map(roster.map((r) => [r.id, r]))

  return (
    <div className="bg-panel border border-outline rounded-lg p-2.5 text-xs space-y-2">
      <p className="font-medium text-ink truncate">{event.title}</p>
      {athleteIds.length === 0 && <p className="text-[10px] text-status-neutral">Sin asignar</p>}

      {athleteIds.map((athleteId) => {
        const athlete = rosterById.get(athleteId)
        const fb = feedbackByAthlete.get(athleteId)
        return (
          <div key={athleteId} className="border-t border-outline pt-1.5">
            <p className="text-[10px] text-status-neutral flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(fb?.status ?? null)}`} />
              {athlete?.person ? `${athlete.person.firstName} ${athlete.person.lastName}` : '—'}
              {fb?.status && <span className="text-status-neutral/80">· {STATUS_LABEL[fb.status]}</span>}
            </p>
            {structuredLines.length === 0 && <p className="text-[10px] text-gray-300">Sin líneas estructuradas</p>}
            {structuredLines.map((line) => {
              const planned = getPrimaryValue(line)
              const executed = observations.find(
                (o) => o.athleteMembershipId === athleteId && o.observableId === line.observableId && o.state === 'ejecutado'
              )
              return (
                <div key={line.id} className="flex items-center justify-between gap-2">
                  <span className="text-ink truncate">{line.rawText}</span>
                  <span
                    className={executed ? 'text-status-positive font-medium' : 'text-status-neutral'}
                  >
                    {planned ?? '—'} {executed ? `→ ${executed.value}` : '(pendiente)'}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
