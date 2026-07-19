import { getTodayISO } from '@/lib/today'
import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import {
  getAthletesWithoutExecutionSince,
  getOrgStats,
  getUpcomingEventsOrg,
  getAttendanceSeries,
  getFeedbackRateSeries,
} from '@/domains/dashboard/queries'
import { getLowestEnergyToday } from '@/domains/observations/checkin'
import { getDaySchedule } from '@/domains/dashboard/day-schedule'
import { getObjectives } from '@/domains/planning/queries'
import { AttendanceChart } from './attendance-chart'
import { PerformanceChart } from './performance-chart'
import { TrainingDayList } from '@/components/ui/training-day-list'

export const dynamic = 'force-dynamic'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function formatEventDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
}

const TYPE_LABELS: Record<string, string> = {
  entrenamiento: 'Entrenamiento',
  competencia: 'Competencia',
  viaje: 'Viaje',
  concentracion: 'Concentración',
  medico: 'Médico',
  reunion: 'Reunión',
}

export default async function ResumenPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const today = getTodayISO()

  const [withoutExecution, stats, upcoming, attendance, feedbackRate, lowestEnergy, todaySchedule, objectives] = await Promise.all([
    getAthletesWithoutExecutionSince(membership.id, daysAgo(4)),
    getOrgStats(membership.organizationId),
    getUpcomingEventsOrg(membership.organizationId, 5),
    getAttendanceSeries(membership.organizationId, 10),
    getFeedbackRateSeries(membership.organizationId, 10),
    getLowestEnergyToday(membership.organizationId, today, 3),
    getDaySchedule(membership.organizationId, today),
    getObjectives(membership.organizationId),
  ])

  const upcomingCompetitions = upcoming.filter((e) => e.type === 'competencia').length
  const objectivesAchieved = objectives.filter((o) => o.achieved).length
  const hasAlerts = withoutExecution.length > 0 || lowestEnergy.length > 0

  return (
    <div className="space-y-7">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-semibold">Resumen</p>
        <h1 className="font-display text-[26px] font-bold text-ink tracking-tight">
          {new Date(today + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
      </div>

      {/* Fila superior — KPIs, lo primero que se ve */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon="🏃" label="Atletas activos" value={stats.athletes.count} delta={stats.athletes.deltaWeek} href="/atletas" tone="blue" />
        <KpiCard icon="💪" label="Entrenamientos" value={stats.sessions.count} delta={stats.sessions.deltaWeek} href="/calendario" tone="neutral" />
        <KpiCard icon="🏆" label="Próximas competencias" value={upcomingCompetitions} href="/competencias" tone="orange" />
        <KpiCard icon="🎯" label="Objetivos cumplidos" value={objectivesAchieved} href="/planificacion" tone="green" />
      </div>

      {/* Fila central — carga y evolución */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Link href="/calendario" className="card p-5 block hover:border-navy/30 transition-colors">
          <p className="text-sm font-semibold text-ink mb-1">Carga semanal (asistencia)</p>
          <p className="text-[11px] text-status-neutral mb-3">Atletas asignados vs. atletas que completaron, últimas sesiones.</p>
          {attendance.length === 0 ? <p className="text-sm text-status-neutral">Sin datos todavía.</p> : <AttendanceChart data={attendance} />}
        </Link>
        <Link href="/calendario?view=dia" className="card p-5 block hover:border-navy/30 transition-colors">
          <p className="text-sm font-semibold text-ink mb-1">Evolución del feedback</p>
          <p className="text-[11px] text-status-neutral mb-3">% de atletas que te contaron cómo les fue en cada entrenamiento.</p>
          {feedbackRate.length === 0 ? <p className="text-sm text-status-neutral">Sin datos todavía.</p> : <PerformanceChart data={feedbackRate} />}
        </Link>
      </div>

      {/* Fila inferior — actividad, tareas y alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink">Actividad de hoy</p>
            <Link href="/calendario?view=dia" className="text-xs text-navy font-medium">
              Ver día →
            </Link>
          </div>
          <TrainingDayList trainings={todaySchedule} />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink">Próximas tareas</p>
            <Link href="/calendario" className="text-xs text-navy font-medium">
              Ver todas →
            </Link>
          </div>
          {upcoming.length === 0 && <p className="text-sm text-status-neutral">Sin eventos próximos.</p>}
          <div className="divide-y divide-outline">
            {upcoming.map((e) => (
              <Link
                key={e.id}
                href={`/calendario?week=${e.date}&view=dia`}
                className="py-2.5 flex items-center justify-between gap-2 hover:bg-outline/20 -mx-1 px-1 rounded"
              >
                <div className="min-w-0">
                  <p className="text-[11px] text-gold font-semibold">{TYPE_LABELS[e.type] ?? e.type}</p>
                  <p className="text-sm font-medium text-ink truncate">{e.title}</p>
                  <p className="text-xs text-status-neutral">{formatEventDate(e.date)}</p>
                </div>
                {e.assignedCount > 0 && (
                  <span className="text-xs text-status-neutral shrink-0">
                    {e.completedCount}/{e.assignedCount}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-semibold text-ink mb-3">Alertas importantes</p>
          {!hasAlerts ? (
            <p className="text-sm text-status-neutral">Sin alertas — todo al día.</p>
          ) : (
            <div className="space-y-4">
              {withoutExecution.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-status-critical mb-1.5">🔴 Sin registrar hace 4+ días</p>
                  <ul className="space-y-1">
                    {withoutExecution.map((a) => (
                      <li key={a.athleteMembershipId}>
                        <Link href={`/atletas/${a.athleteMembershipId}`} className="text-sm text-ink hover:underline">
                          {a.athleteName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {lowestEnergy.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-status-attention">🔋 Menor energía hoy</p>
                    <Link href="/resumen/energia" className="text-[11px] text-navy font-medium">
                      Ver todos →
                    </Link>
                  </div>
                  <ul className="space-y-1">
                    {lowestEnergy.map((a) => (
                      <li key={a.athleteMembershipId}>
                        <Link href={`/atletas/${a.athleteMembershipId}`} className="text-sm text-ink hover:underline flex items-center justify-between">
                          <span>{a.athleteName}</span>
                          <span className="text-status-neutral text-xs">{a.energia ?? '—'}/10</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const TONE_STYLES: Record<string, string> = {
  blue: 'bg-navy/10 text-navy',
  green: 'bg-status-positive/10 text-status-positive',
  orange: 'bg-gold/10 text-gold',
  neutral: 'bg-status-neutral/10 text-status-neutral',
}

function KpiCard({
  icon,
  label,
  value,
  delta,
  href,
  tone,
}: {
  icon: string
  label: string
  value: number
  delta?: number
  href: string
  tone: string
}) {
  return (
    <Link href={href} className="card-hover p-4 block">
      <div className="flex items-start justify-between mb-2">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${TONE_STYLES[tone]}`}>{icon}</span>
        {!!delta && delta > 0 && <span className="text-[11px] font-medium text-status-positive">+{delta}</span>}
      </div>
      <p className="font-display text-2xl font-bold text-ink leading-none">{value}</p>
      <p className="text-xs text-status-neutral mt-1.5">{label}</p>
    </Link>
  )
}
