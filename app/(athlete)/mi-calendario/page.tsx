import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getEventsForRange } from '@/domains/events/queries'
import { getResolvedSessionForAthlete } from '@/domains/observations/session-view'
import { getTodayDate } from '@/lib/today'
import { SessionAccordion } from './session-accordion'

export const dynamic = 'force-dynamic'

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function MiCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const params = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const base = params.week ? new Date(params.week + 'T00:00:00') : getTodayDate()
  const weekStart = startOfWeek(base)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })
  const weekStartStr = toISO(weekStart)
  const weekEndStr = toISO(days[6])
  const prevWeek = toISO(new Date(weekStart.getTime() - 7 * 86400000))
  const nextWeek = toISO(new Date(weekStart.getTime() + 7 * 86400000))

  const events = await getEventsForRange(membership.organizationId, weekStartStr, weekEndStr)
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
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Calendario</p>
        <h1 className="font-display text-2xl font-bold text-ink">Mi semana</h1>
      </div>

      <div className="flex items-center justify-between text-sm">
        <a href={`?week=${prevWeek}`} className="px-3 py-1.5 rounded-md border border-outline">◀</a>
        <span className="text-status-neutral text-xs">{weekStartStr} — {weekEndStr}</span>
        <a href={`?week=${nextWeek}`} className="px-3 py-1.5 rounded-md border border-outline">▶</a>
      </div>

      <div className="space-y-3">
        {days.map((day, i) => {
          const dateStr = toISO(day)
          const daySessions = sessions.filter((s) => s.event.date === dateStr)
          if (daySessions.length === 0) return null

          return (
            <div key={i}>
              <p className="text-xs uppercase tracking-wide text-status-neutral mb-1.5">
                {DAY_NAMES[i]} {day.getDate()}
              </p>
              {daySessions.map(({ event, lines }) => (
                <SessionAccordion key={event.id} title={event.title} lines={lines} />
              ))}
            </div>
          )
        })}

        {sessions.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-panel p-5 shadow-sm text-center text-sm text-status-neutral">
            Sin entrenamientos esta semana.
          </div>
        )}
      </div>
    </div>
  )
}
