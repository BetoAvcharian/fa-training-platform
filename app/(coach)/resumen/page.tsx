import { getMyActiveMembership } from '@/domains/athletes/queries'
import {
  getAthletesWithoutExecutionSince,
  getWellnessAlerts,
  getUpcomingCompetitions,
  getTodaySummary,
} from '@/domains/dashboard/queries'

export const dynamic = 'force-dynamic'

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default async function ResumenPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const today = new Date().toISOString().slice(0, 10)
  const in14Days = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)

  const [withoutExecution, wellness, competitions, summary] = await Promise.all([
    getAthletesWithoutExecutionSince(membership.id, daysAgo(4)),
    getWellnessAlerts(membership.id, today),
    getUpcomingCompetitions(membership.id, today, in14Days),
    getTodaySummary(membership.id, today),
  ])

  const hasAlerts = withoutExecution.length > 0 || wellness.length > 0

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Resumen</p>
        <h1 className="font-display text-2xl font-bold text-navy">
          {new Date(today + 'T00:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h1>
      </div>

      {/* Jerarquía de la Fase 8.2, confirmada: alertas primero, siempre */}
      {hasAlerts && (
        <div className="space-y-3">
          {withoutExecution.length > 0 && (
            <div className="rounded-xl border border-status-critical/20 bg-status-critical/5 p-4">
              <p className="text-sm font-medium text-status-critical mb-2">🔴 Atención requerida ({withoutExecution.length})</p>
              <ul className="space-y-1">
                {withoutExecution.map((a) => (
                  <li key={a.athleteMembershipId} className="text-sm text-navy">
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
                  <li key={a.athleteMembershipId} className="text-sm text-navy">
                    {a.athleteName} — energía {a.energia ?? '—'}/5, fatiga {a.fatiga ?? '—'}/5
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {competitions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-navy mb-2">ℹ️ Próximas competencias</p>
          <ul className="space-y-1">
            {competitions.map((c) => (
              <li key={`${c.eventId}-${c.athleteName}`} className="text-sm text-status-neutral">
                {c.date} — {c.title} ({c.athleteName})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-status-neutral uppercase tracking-wide">Hoy — asignados</p>
          <p className="font-display text-2xl font-bold text-navy">{summary.assigned}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-status-neutral uppercase tracking-wide">Hoy — completados</p>
          <p className="font-display text-2xl font-bold text-status-positive">{summary.completed}</p>
        </div>
      </div>

      {!hasAlerts && (
        <p className="text-sm text-status-neutral">Sin alertas — todo en orden.</p>
      )}
    </div>
  )
}
