import { getTodayISO } from '@/lib/today'
import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import {
  getAthletesWithoutExecutionSince,
  getWellnessAlerts,
  getUpcomingCompetitions,
  getOrgStats,
  getUpcomingEventsOrg,
  getAttendanceSeries,
} from '@/domains/dashboard/queries'
import { AttendanceChart } from './attendance-chart'
import { PerformanceChart } from './performance-chart'

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
  const in14Days = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

  const [withoutExecution, wellness, competitions, stats, upcoming, attendance] = await Promise.all([
    getAthletesWithoutExecutionSince(membership.id, daysAgo(4)),
    getWellnessAlerts(membership.id, today),
    getUpcomingCompetitions(membership.id, today, in14Days),
    getOrgStats(membership.organizationId),
    getUpcomingEventsOrg(membership.organizationId, 5),
    getAttendanceSeries(membership.organizationId, 10),
  ])

  const hasAlerts = withoutExecution.length > 0 || wellness.length > 0

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
                  <li key={a.athleteMembershipId} className="text-sm text-ink">
                    {a.athleteName} — sin registrar hace más de 4 días
                  </li>
                ))}
              </ul>
            </div>
          )}

          {wellness.length > 0 && (
            <div className="rounded-xl border border-status-attention/20 bg-status-attention/5 p-4">
              <p className="text-sm font-medium text-status-attention mb-2">🟠 Seguimiento ({wellness.length})</p>
              <ul className="space-y-1">
                {wellness.map((a) => (
                  <li key={a.athleteMembershipId} className="text-sm text-ink">
                    {a.athleteName} — energía {a.energia ?? '—'}/5, fatiga {a.fatiga ?? '—'}/5
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {competitions.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-medium text-ink mb-2">ℹ️ Próximas competencias</p>
          <ul className="space-y-1">
            {competitions.map((c) => (
              <li key={`${c.eventId}-${c.athleteName}`} className="text-sm text-status-neutral">
                {c.date} — {c.title} ({c.athleteName})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Ejercicios" value={stats.drills.count} delta={stats.drills.deltaWeek} />
        <StatCard label="Sesiones" value={stats.sessions.count} delta={stats.sessions.deltaWeek} />
        <StatCard label="Atletas" value={stats.athletes.count} delta={stats.athletes.deltaWeek} />
        <StatCard label="Miembros activos" value={stats.activeMembers.count} delta={stats.activeMembers.deltaWeek} />
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
          <div className="divide-y divide-gray-100">
            {upcoming.map((e) => (
              <div key={e.id} className="py-3 flex items-center justify-between gap-2">
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
              </div>
            ))}
          </div>
        </div>

        {/* Gráficos */}
        <div className="space-y-4">
          <div className="card p-4">
            <p className="text-sm font-semibold text-ink mb-2">Rendimiento (% completado, últimas sesiones)</p>
            {attendance.length === 0 ? (
              <p className="text-sm text-status-neutral">Sin datos todavía.</p>
            ) : (
              <PerformanceChart data={attendance} />
            )}
          </div>
          <div className="card p-4">
            <p className="text-sm font-semibold text-ink mb-2">Asistencia (últimas sesiones)</p>
            {attendance.length === 0 ? (
              <p className="text-sm text-status-neutral">Sin datos todavía.</p>
            ) : (
              <AttendanceChart data={attendance} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, delta }: { label: string; value: number; delta: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-status-neutral uppercase tracking-wide">{label}</p>
      <p className="font-display text-2xl font-bold text-ink">{value}</p>
      {delta > 0 && <p className="text-xs text-status-positive mt-0.5">+{delta} esta semana</p>}
    </div>
  )
}
