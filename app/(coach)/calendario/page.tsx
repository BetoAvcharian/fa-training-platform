import { getMyActiveMembership, getRoster, getGroups } from '@/domains/athletes/queries'
import { getEventsForRange, getSessionExercises } from '@/domains/events/queries'
import { EventCard } from './event-card'
import { EventCompareCard } from './event-compare-card'
import { CopyWeekForm } from './copy-week-form'
import { createEventAction } from './actions'

export const dynamic = 'force-dynamic'

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

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
  searchParams: Promise<{ week?: string; mode?: string; view?: string; month?: string }>
}) {
  const params = await searchParams
  const mode = params.mode === 'ver' ? 'ver' : 'planificar'
  const view = params.view === 'mes' ? 'mes' : 'semana'
  const membership = await getMyActiveMembership()
  if (!membership) return null

  if (view === 'mes') {
    return <MonthView monthParam={params.month} mode={mode} organizationId={membership.organizationId} />
  }

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

  const [events, roster, groups] = await Promise.all([
    getEventsForRange(membership.organizationId, weekStartStr, weekEndStr),
    getRoster(membership.organizationId),
    getGroups(membership.organizationId),
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
          <h1 className="font-display text-2xl font-bold text-navy">{mode === 'ver' ? 'Ver' : 'Planificar'}</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            <a
              href={`?week=${weekStartStr}&mode=planificar`}
              className={`px-3 py-1.5 ${mode === 'planificar' ? 'bg-navy text-white' : 'bg-white text-navy'}`}
            >
              Planificar
            </a>
            <a
              href={`?week=${weekStartStr}&mode=ver`}
              className={`px-3 py-1.5 ${mode === 'ver' ? 'bg-navy text-white' : 'bg-white text-navy'}`}
            >
              Ver
            </a>
          </div>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            <a href={`?week=${weekStartStr}&mode=${mode}&view=semana`} className="px-3 py-1.5 bg-navy text-white">
              Semana
            </a>
            <a href={`?week=${weekStartStr}&mode=${mode}&view=mes`} className="px-3 py-1.5 bg-white text-navy">
              Mes
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a href={`?week=${prevWeek}&mode=${mode}`} className="px-3 py-1.5 rounded-md border border-gray-300">◀</a>
            <span className="text-status-neutral">{weekStartStr} — {weekEndStr}</span>
            <a href={`?week=${nextWeek}&mode=${mode}`} className="px-3 py-1.5 rounded-md border border-gray-300">▶</a>
          </div>
          {mode === 'planificar' && <CopyWeekForm weekStart={weekStartStr} />}
        </div>
      </div>

      {mode === 'planificar' && (
        <details className="mb-6 max-w-md">
          <summary className="cursor-pointer text-sm font-medium text-navy">+ Nuevo entrenamiento</summary>
          <form
            action={async (formData: FormData) => {
              'use server'
              await createEventAction(formData)
            }}
            className="mt-3 space-y-2 bg-white border border-gray-200 rounded-xl p-4"
          >
            <input name="title" placeholder="Título (ej: Series de pista)" required className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input name="date" type="date" required defaultValue={weekStartStr} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select name="athleteId" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Elegí un atleta</option>
              {roster.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.person?.firstName} {a.person?.lastName}
                </option>
              ))}
            </select>
            {groups.length > 0 && (
              <select name="groupId" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">— O elegí un grupo completo —</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            )}
            <button type="submit" className="w-full btn-primary py-2 text-sm">Crear</button>
          </form>
        </details>
      )}

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
                {dayEvents.map(({ event, lines }) =>
                  mode === 'ver' ? (
                    <EventCompareCard key={event.id} event={event} roster={roster} />
                  ) : (
                    <EventCard key={event.id} event={event} lines={lines} roster={roster} />
                  )
                )}
                {dayEvents.length === 0 && <div className="text-[11px] text-gray-300">—</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

async function MonthView({
  monthParam,
  mode,
  organizationId,
}: {
  monthParam?: string
  mode: string
  organizationId: string
}) {
  const base = monthParam ? new Date(monthParam + '-01T00:00:00') : new Date()
  const year = base.getFullYear()
  const month = base.getMonth()
  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`

  const firstOfMonth = new Date(year, month, 1)
  const lastOfMonth = new Date(year, month + 1, 0)
  const gridStart = startOfWeek(firstOfMonth)
  const gridEnd = new Date(lastOfMonth)
  const gridEndDay = gridEnd.getDay()
  gridEnd.setDate(gridEnd.getDate() + (gridEndDay === 0 ? 0 : 7 - gridEndDay))

  const events = await getEventsForRange(organizationId, toISO(gridStart), toISO(gridEnd))

  const prevMonth = new Date(year, month - 1, 1)
  const nextMonth = new Date(year, month + 1, 1)
  const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  const nextMonthStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`

  const days: Date[] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Calendario</p>
          <h1 className="font-display text-2xl font-bold text-navy">
            {MONTH_NAMES[month]} {year}
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            <a href={`?view=semana&mode=${mode}`} className="px-3 py-1.5 bg-white text-navy">
              Semana
            </a>
            <a href={`?month=${monthStr}&mode=${mode}&view=mes`} className="px-3 py-1.5 bg-navy text-white">
              Mes
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a href={`?month=${prevMonthStr}&mode=${mode}&view=mes`} className="px-3 py-1.5 rounded-md border border-gray-300">◀</a>
            <a href={`?month=${nextMonthStr}&mode=${mode}&view=mes`} className="px-3 py-1.5 rounded-md border border-gray-300">▶</a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {DAY_NAMES.map((d) => (
          <p key={d} className="text-xs font-medium text-status-neutral text-center">
            {d}
          </p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, i) => {
          const dateStr = toISO(day)
          const dayEvents = events.filter((e) => e.date === dateStr)
          const inMonth = day.getMonth() === month
          const dayWeekStart = toISO(startOfWeek(day))
          return (
            <a
              key={i}
              href={`?week=${dayWeekStart}&mode=${mode}&view=semana`}
              className={`min-h-[80px] rounded-lg border p-1.5 ${inMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}
            >
              <p className={`text-xs ${inMonth ? 'text-navy' : 'text-gray-300'}`}>{day.getDate()}</p>
              <div className="space-y-0.5 mt-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <p key={e.id} className="text-[9px] bg-navy/5 text-navy rounded px-1 py-0.5 truncate">
                    {e.title}
                  </p>
                ))}
                {dayEvents.length > 3 && <p className="text-[9px] text-status-neutral">+{dayEvents.length - 3} más</p>}
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}
