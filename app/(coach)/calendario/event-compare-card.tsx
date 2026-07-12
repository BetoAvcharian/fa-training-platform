import { getEventAssignments, getSessionExercises } from '@/domains/events/queries'
import { getObservationsForEvent } from '@/domains/observations/queries'
import { getPrimaryValue } from '@/domains/events/rules'
import type { Event } from '@/domains/events/types'

interface RosterEntry {
  id: string
  person: { firstName: string; lastName: string } | null
}

export async function EventCompareCard({ event, roster }: { event: Event; roster: RosterEntry[] }) {
  const [assignments, lines, observations] = await Promise.all([
    getEventAssignments(event.id),
    getSessionExercises(event.id),
    getObservationsForEvent(event.id),
  ])

  const structuredLines = lines.filter((l) => l.isStructured && l.observableId)
  const athleteIds = assignments.filter((a) => a.assigneeType === 'athlete').map((a) => a.assigneeId)
  const rosterById = new Map(roster.map((r) => [r.id, r]))

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-xs space-y-2">
      <p className="font-medium text-navy truncate">{event.title}</p>
      {athleteIds.length === 0 && <p className="text-[10px] text-status-neutral">Sin asignar</p>}

      {athleteIds.map((athleteId) => {
        const athlete = rosterById.get(athleteId)
        return (
          <div key={athleteId} className="border-t border-gray-100 pt-1.5">
            <p className="text-[10px] text-status-neutral">
              {athlete?.person ? `${athlete.person.firstName} ${athlete.person.lastName}` : '—'}
            </p>
            {structuredLines.length === 0 && <p className="text-[10px] text-gray-300">Sin líneas estructuradas</p>}
            {structuredLines.map((line) => {
              const planned = getPrimaryValue(line)
              const executed = observations.find(
                (o) => o.athleteMembershipId === athleteId && o.observableId === line.observableId && o.state === 'ejecutado'
              )
              return (
                <div key={line.id} className="flex items-center justify-between gap-2">
                  <span className="text-navy truncate">{line.rawText}</span>
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
