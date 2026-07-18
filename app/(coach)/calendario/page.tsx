import { getMyActiveMembership, getAthletesForCoach, getRoster, getGroups } from '@/domains/athletes/queries'
import { getEventsForRange, getSessionExercises } from '@/domains/events/queries'
import { getDaySchedule } from '@/domains/dashboard/day-schedule'
import { TrainingDayList } from '@/components/ui/training-day-list'
import { getTodayDate, getTodayISO } from '@/lib/today'
import { EventCard } from './event-card'
import { EventCompareCard } from './event-compare-card'
import { CopyWeekForm } from './copy-week-form'
import { NewTrainingForm } from './new-training-form'

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
  const view = params.view === 'mes' ? 'mes' : params.view === 'dia' ? 'dia' : 'semana'
  const membership = await getMyActiveMembership()
  if (!membership) return null

  if (view === 'mes') {
    return <MonthView monthParam={params.month} mode={mode} organizationId={membership.organizationId} />
  }

  if (view === 'dia') {
    return <DayView dateParam={params.week} organizationId={membership.organizationId} />
  }

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

  const [events, roster, groups] = await Promise.all([
    getEventsForRange(membership.organizationId, weekStartStr, weekEndStr),
    (membership.role === 'manager' ? getRoster(membership.organizationId) : getAthletesForCoach(membership.id)),
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
          <h1 className="font-display text-2xl font-bold text-ink">{mode === 'ver' ? 'Ver' : 'Planificar'}</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-outline overflow-hidden text-xs">
            <a
              href={`?week=${weekStartStr}&mode=planificar`}
              className={`px-3 py-1.5 ${mode === 'planificar' ? 'bg-navy text-white' : 'bg-panel text-ink'}`}
            >
              Planificar
            </a>
            <a
              href={`?week=${weekStartStr}&mode=ver`}
              className={`px-3 py-1.5 ${mode === 'ver' ? 'bg-navy text-white' : 'bg-panel text-ink'}`}
            >
              Ver
            </a>
          </div>
          <div className="flex rounded-lg border border-outline overflow-hidden text-xs">
            <a href={`?week=${weekStartStr}&mode=${mode}&view=dia`} className="px-3 py-1.5 bg-panel text-ink">
              Día
            </a>
            <a href={`?week=${weekStartStr}&mode=${mode}&view=semana`} className="px-3 py-1.5 bg-navy text-white">
              Semana
            </a>
            <a href={`?week=${weekStartStr}&mode=${mode}&view=mes`} className="px-3 py-1.5 bg-panel text-ink">
              Mes
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a href={`?week=${prevWeek}&mode=${mode}`} className="px-3 py-1.5 rounded-md border border-outline">◀</a>
            <span className="text-status-neutral">{weekStartStr} — {weekEndStr}</span>
            <a href={`?week=${nextWeek}&mode=${mode}`} className="px-3 py-1.5 rounded-md border border-outline">▶</a>
          </div>
          {mode === 'planificar' && <CopyWeekForm weekStart={weekStartStr} />}
        </div>
      </div>

      {mode === 'planificar' && (
        <NewTrainingForm roster={roster} groups={groups} defaultDate={weekStartStr} />
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
  const base = monthParam ? new Date(monthParam + '-01T00:00:00') : getTodayDate()
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
          <h1 className="font-display text-2xl font-bold text-ink">
            {MONTH_NAMES[month]} {year}
          </h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-outline overflow-hidden text-xs">
            <a href={`?view=semana&mode=${mode}`} className="px-3 py-1.5 bg-panel text-ink">
              Semana
            </a>
            <a href={`?month=${monthStr}&mode=${mode}&view=mes`} className="px-3 py-1.5 bg-navy text-white">
              Mes
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a href={`?month=${prevMonthStr}&mode=${mode}&view=mes`} className="px-3 py-1.5 rounded-md border border-outline">◀</a>
            <a href={`?month=${nextMonthStr}&mode=${mode}&view=mes`} className="px-3 py-1.5 rounded-md border border-outline">▶</a>
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
              className={`min-h-[80px] rounded-lg border p-1.5 ${inMonth ? 'bg-panel border-outline' : 'bg-outline/40 border-outline'}`}
            >
              <p className={`text-xs ${inMonth ? 'text-ink' : 'text-gray-300'}`}>{day.getDate()}</p>
              <div className="space-y-0.5 mt-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <p key={e.id} className="text-[9px] bg-navy/5 text-ink rounded px-1 py-0.5 truncate">
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

async function DayView({ dateParam, organizationId }: { dateParam?: string; organizationId: string }) {
  const date = dateParam ?? getTodayISO()
  const d = new Date(date + 'T00:00:00')
  const prevDay = new Date(d.getTime() - 86400000).toISOString().slice(0, 10)
  const nextDay = new Date(d.getTime() + 86400000).toISOString().slice(0, 10)
  const label = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  const trainings = await getDaySchedule(organizationId, date)

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Calendario</p>
          <h1 className="font-display text-2xl font-bold text-ink capitalize">{label}</h1>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-outline overflow-hidden text-xs">
            <a href={`?week=${date}&view=dia`} className="px-3 py-1.5 bg-navy text-white">
              Día
            </a>
            <a href={`?week=${date}&view=semana`} className="px-3 py-1.5 bg-panel text-ink">
              Semana
            </a>
            <a href={`?week=${date}&view=mes`} className="px-3 py-1.5 bg-panel text-ink">
              Mes
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <a href={`?week=${prevDay}&view=dia`} className="px-3 py-1.5 rounded-md border border-outline">◀ Ayer</a>
            <a href={`?week=${getTodayISO()}&view=dia`} className="px-3 py-1.5 rounded-md border border-outline">Hoy</a>
            <a href={`?week=${nextDay}&view=dia`} className="px-3 py-1.5 rounded-md border border-outline">Mañana ▶</a>
          </div>
        </div>
      </div>

      <TrainingDayList trainings={trainings} />
    </div>
  )
}
