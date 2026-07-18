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

  const [withoutExecution, stats, upcoming, attendance, feedbackRate, lowestEnergy, todaySchedule] = await Promise.all([
    getAthletesWithoutExecutionSince(membership.id, daysAgo(4)),
    getOrgStats(membership.organizationId),
    getUpcomingEventsOrg(membership.organizationId, 5),
    getAttendanceSeries(membership.organizationId, 10),
    getFeedbackRateSeries(membership.organizationId, 10),
    getLowestEnergyToday(membership.organizationId, today, 3),
    getDaySchedule(membership.organizationId, today),
  ])

  const hasAlerts = withoutExecution.length > 0

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Resumen</p>
        <h1 className="font-display text-2xl font-bold text-ink">
          {new Date(today + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
      </div>

      {/* Jerarquía: alertas primero, siempre */}
      {hasAlerts && (
        <div className="space-y-3">
          {withoutExecution.length > 0 && (
            <div className="rounded-xl border border-status-critical/20 bg-status-critical/5 p-4">
              <p className="text-sm font-medium text-status-critical mb-2">🔴 Atención requerida ({withoutExecution.length})</p>
              <ul className="space-y-1">
                {withoutExecution.map((a) => (
                  <li key={a.athleteMembershipId}>
                    <Link href={`/atletas/${a.athleteMembershipId}`} className="text-sm text-ink hover:underline">
                      {a.athleteName} — sin registrar hace más de 4 días
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {lowestEnergy.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-ink">🔋 Menor energía hoy</p>
            <Link href="/resumen/energia" className="text-xs text-gold font-medium">
              Ver todos →
            </Link>
          </div>
          <ul className="space-y-1">
            {lowestEnergy.map((a) => (
              <li key={a.athleteMembershipId}>
                <Link href={`/atletas/${a.athleteMembershipId}`} className="text-sm text-ink hover:underline flex items-center justify-between">
                  <span>{a.athleteName}</span>
                  <span className="text-status-neutral">
                    energía {a.energia ?? '—'}/10{a.fatiga !== null && ` · fatiga ${a.fatiga}/10`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tarjetas de métricas — clickeables, cada una a su módulo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Ejercicios" value={stats.drills.count} delta={stats.drills.deltaWeek} href="/registros" />
        <StatCard label="Sesiones" value={stats.sessions.count} delta={stats.sessions.deltaWeek} href="/calendario" />
        <StatCard label="Atletas" value={stats.athletes.count} delta={stats.athletes.deltaWeek} href="/atletas" />
        <StatCard label="Miembros activos" value={stats.activeMembers.count} delta={stats.activeMembers.deltaWeek} href="/atletas" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximos eventos */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink">Próximos eventos</p>
            <Link href="/calendario" className="text-xs text-gold font-medium">
              Ver todos →
            </Link>
          </div>
          {upcoming.length === 0 && <p className="text-sm text-status-neutral">Sin eventos próximos.</p>}
          <div className="divide-y divide-outline">
            {upcoming.map((e) => (
              <Link
                key={e.id}
                href={`/calendario?week=${e.date}&view=dia`}
                className="py-3 flex items-center justify-between gap-2 hover:bg-outline/20 -mx-1 px-1 rounded"
              >
                <div>
                  <p className="text-xs text-gold font-medium">{TYPE_LABELS[e.type] ?? e.type}</p>
                  <p className="text-sm font-medium text-ink">{e.title}</p>
                  <p className="text-xs text-status-neutral">{formatEventDate(e.date)}</p>
                </div>
                {e.assignedCount > 0 && (
                  <span className="text-xs text-status-neutral shrink-0">
                    {e.completedCount}/{e.assignedCount} hechos
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Gráficos */}
        <div className="space-y-4">
          <Link href="/calendario?view=dia" className="card p-4 block hover:border-gold/40 transition-colors">
            <p className="text-sm font-semibold text-ink mb-2">Feedback recibido (últimas sesiones)</p>
            <p className="text-[11px] text-status-neutral mb-2">
              % de atletas asignados que te contaron cómo les fue en cada entrenamiento.
            </p>
            {feedbackRate.length === 0 ? (
              <p className="text-sm text-status-neutral">Sin datos todavía.</p>
            ) : (
              <PerformanceChart data={feedbackRate} />
            )}
          </Link>
          <Link href="/calendario" className="card p-4 block hover:border-gold/40 transition-colors">
            <p className="text-sm font-semibold text-ink mb-2">Asistencia (últimas sesiones)</p>
            {attendance.length === 0 ? (
              <p className="text-sm text-status-neutral">Sin datos todavía.</p>
            ) : (
              <AttendanceChart data={attendance} />
            )}
          </Link>
        </div>
      </div>

      {/* Vista del día — mismo módulo que Calendario > Día, acá solo hoy */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-ink">Hoy — entrenamientos del día</p>
          <Link href="/calendario?view=dia" className="text-xs text-gold font-medium">
            Ver calendario por día →
          </Link>
        </div>
        <TrainingDayList trainings={todaySchedule} />
      </div>
    </div>
  )
}

function StatCard({ label, value, delta, href }: { label: string; value: number; delta: number; href: string }) {
  return (
    <Link href={href} className="card-hover p-4 block">
      <p className="text-xs text-status-neutral uppercase tracking-wide">{label}</p>
      <p className="font-display text-2xl font-bold text-ink">{value}</p>
      {delta > 0 && <p className="text-xs text-status-positive mt-0.5">+{delta} esta semana</p>}
    </Link>
  )
}
