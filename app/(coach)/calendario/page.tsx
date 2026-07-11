import { getMyActiveMembership, getRoster } from '@/domains/athletes/queries'
import { getEventsForRange, getSessionExercises } from '@/domains/events/queries'
import { EventCard } from './event-card'
import { createEventAction } from './actions'

export const dynamic = 'force-dynamic'

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

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

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const params = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const base = params.week ? new Date(params.week + 'T00:00:00') : new Date()
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

  const [events, roster] = await Promise.all([
    getEventsForRange(membership.organizationId, weekStartStr, weekEndStr),
    getRoster(membership.organizationId),
  ])

  const eventsWithLines = await Promise.all(
    events
      .filter((e) => e.type === 'entrenamiento')
      .map(async (event) => ({ event, lines: await getSessionExercises(event.id) }))
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Calendario</p>
          <h1 className="font-display text-2xl font-bold text-navy">Planificar</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <a href={`?week=${prevWeek}`} className="px-3 py-1.5 rounded-md border border-gray-300">◀</a>
          <span className="text-status-neutral">{weekStartStr} — {weekEndStr}</span>
          <a href={`?week=${nextWeek}`} className="px-3 py-1.5 rounded-md border border-gray-300">▶</a>
        </div>
      </div>

      <details className="mb-6 max-w-md">
        <summary className="cursor-pointer text-sm font-medium text-navy">+ Nuevo entrenamiento</summary>
        <form action={createEventAction} className="mt-3 space-y-2 bg-white border border-gray-200 rounded-xl p-4">
          <input name="title" placeholder="Título (ej: Series de pista)" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <input name="date" type="date" required defaultValue={weekStartStr} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <select name="athleteId" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Elegí un atleta</option>
            {roster.map((a) => (
              <option key={a.id} value={a.id}>
                {a.person?.firstName} {a.person?.lastName}
              </option>
            ))}
          </select>
          <button type="submit" className="w-full bg-navy text-white rounded-md py-2 text-sm font-medium">Crear</button>
        </form>
      </details>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {days.map((day, i) => {
          const dateStr = toISO(day)
          const dayEvents = eventsWithLines.filter((e) => e.event.date === dateStr)
          return (
            <div key={i} className="min-w-0">
              <p className="text-xs font-medium text-status-neutral mb-2">
                {DAY_NAMES[i]} {day.getDate()}
              </p>
              <div className="space-y-2">
                {dayEvents.map(({ event, lines }) => (
                  <EventCard key={event.id} event={event} lines={lines} />
                ))}
                {dayEvents.length === 0 && <div className="text-[11px] text-gray-300">—</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
