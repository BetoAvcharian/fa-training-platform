import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getEventsForRange } from '@/domains/events/queries'
import { getResolvedSessionForAthlete } from '@/domains/observations/session-view'
import { hasCheckinForDate } from '@/domains/observations/checkin'
import { CheckinForm } from './checkin-form'
import { SessionLine } from './session-line'

export const dynamic = 'force-dynamic'

export default async function HoyPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const today = new Date().toISOString().slice(0, 10)

  const [events, checkinDone] = await Promise.all([
    getEventsForRange(membership.organizationId, today, today),
    hasCheckinForDate(membership.id, today),
  ])

  const trainingEvents = events.filter((e) => e.type === 'entrenamiento')

  const sessions = await Promise.all(
    trainingEvents.map(async (event) => ({
      event,
      lines: await getResolvedSessionForAthlete(event.id, membership.id),
    }))
  )

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Hoy</p>
        <h1 className="font-display text-2xl font-bold text-navy">
          {new Date(today + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
      </div>

      <CheckinForm alreadySubmitted={checkinDone} />

      <div className="space-y-3">
        {sessions.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center text-sm text-status-neutral">
            Sin entrenamiento asignado para hoy.
          </div>
        )}

        {sessions.map(({ event, lines }) => (
          <div key={event.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gold font-semibold mb-1">Entrenamiento de hoy</p>
            <p className="font-display font-bold text-navy mb-3">{event.title}</p>

            <div className="space-y-2">
              {lines.map(({ line, executed }) => (
                <SessionLine key={line.id} line={line} executed={executed} />
              ))}
              {lines.length === 0 && <p className="text-sm text-status-neutral">Sin ejercicios cargados todavía.</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
