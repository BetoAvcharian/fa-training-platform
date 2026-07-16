import Link from 'next/link'
import { getMyActiveMembership, getMyProfile } from '@/domains/athletes/queries'
import { getCycleLogs, getCycleStats } from '@/domains/health/cycle'
import { getTodayISO } from '@/lib/today'
import { CycleCalendar } from './cycle-calendar'

export const dynamic = 'force-dynamic'

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1)
  const startDay = (firstOfMonth.getDay() + 6) % 7 // lunes=0
  const gridStart = new Date(year, month, 1 - startDay)

  const days: Array<{ date: string; inMonth: boolean; dayOfWeek: number }> = []
  const cursor = new Date(gridStart)
  for (let i = 0; i < 42; i++) {
    const iso = cursor.toISOString().slice(0, 10)
    days.push({ date: iso, inMonth: cursor.getMonth() === month, dayOfWeek: cursor.getDay() })
    cursor.setDate(cursor.getDate() + 1)
    if (i >= 34 && cursor.getMonth() !== month) break
  }
  return days
}

export default async function CicloPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sParams = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const profile = await getMyProfile()
  const today = getTodayISO()
  const base = sParams.month ? new Date(sParams.month + '-01T00:00:00') : new Date(today + 'T00:00:00')
  const year = base.getFullYear()
  const month = base.getMonth()

  const days = buildMonthGrid(year, month)
  const fromDate = days[0].date
  const toDate = days[days.length - 1].date

  const [logs, stats] = await Promise.all([
    getCycleLogs(membership.id, fromDate, toDate),
    getCycleStats(membership.id),
  ])
  const logsByDate = new Map(logs.map((l) => [l.date, l]))

  const prevMonth = new Date(year, month - 1, 1)
  const nextMonth = new Date(year, month + 1, 1)
  const monthLabel = base.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/mi-salud" className="text-xs text-status-neutral hover:text-navy">
          ← Volver a Salud
        </Link>
        <p className="text-xs uppercase tracking-wider text-gold font-medium mt-2">Salud</p>
        <h1 className="font-display text-2xl font-bold text-navy">Ciclo menstrual</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3 text-center">
          <p className="text-2xl font-display font-bold text-navy">
            {stats.currentCycleDay ?? '—'}
          </p>
          <p className="text-[11px] text-status-neutral">Día del ciclo</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-2xl font-display font-bold text-navy">
            {stats.averageCycleLength ?? '—'}
          </p>
          <p className="text-[11px] text-status-neutral">Duración promedio (días)</p>
        </div>
      </div>

      {stats.predictedNextPeriod && (
        <p className="text-xs text-status-neutral text-center">
          Próximo período estimado:{' '}
          <span className="text-navy font-medium">
            {new Date(stats.predictedNextPeriod + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
          </span>
        </p>
      )}

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <Link href={`/mi-salud/ciclo?month=${prevMonth.toISOString().slice(0, 7)}`} className="text-navy px-2">
            ←
          </Link>
          <p className="text-sm font-semibold text-navy capitalize">{monthLabel}</p>
          <Link href={`/mi-salud/ciclo?month=${nextMonth.toISOString().slice(0, 7)}`} className="text-navy px-2">
            →
          </Link>
        </div>
        <CycleCalendar days={days} logsByDate={logsByDate} predictedNextPeriod={stats.predictedNextPeriod} />
      </div>

      <p className="text-[11px] text-status-neutral text-center">
        Solo vos y tu entrenador pueden ver esto.
      </p>
    </div>
  )
}
