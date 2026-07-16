import Link from 'next/link'
import { getMyHealthEpisodes } from '@/domains/health/queries'
import { getMyActiveMembership, getMyProfile } from '@/domains/athletes/queries'
import { getAnthropometryObservables, getAnthropometryHistory } from '@/domains/observations/anthropometry'
import { HealthForm } from './health-form'
import { EditableHealthCard } from './editable-health-card'
import { AnthropometryForm } from './anthropometry-form'
import { AnthropometryHistory } from './anthropometry-history'

export const dynamic = 'force-dynamic'

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MiSaludPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [episodes, observables, history, profile] = await Promise.all([
    getMyHealthEpisodes(),
    getAnthropometryObservables(membership.organizationId),
    getAnthropometryHistory(membership.id),
    getMyProfile(),
  ])
  const activos = episodes.filter((e) => e.status === 'activo')
  const resueltos = episodes.filter((e) => e.status === 'resuelto')

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Salud</p>
        <h1 className="font-display text-2xl font-bold text-ink">Mi salud</h1>
      </div>

      <HealthForm gender={profile?.gender ?? null} />

      {profile?.gender === 'femenino' && (
        <Link
          href="/mi-salud/ciclo"
          className="flex items-center justify-between rounded-2xl border border-gray-100 bg-panel p-4 shadow-sm"
        >
          <div>
            <p className="font-medium text-ink text-sm">Ciclo menstrual</p>
            <p className="text-xs text-status-neutral">Calendario, síntomas y predicción</p>
          </div>
          <span className="text-ink">→</span>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Activos</h2>
        {activos.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-panel p-4 text-sm text-status-neutral">
            Nada activo por ahora.
          </div>
        )}
        <div className="space-y-2">
          {activos.map((e) => (
            <EditableHealthCard key={e.id} episode={e} />
          ))}
        </div>
      </section>

      {resueltos.length > 0 && (
        <details className="rounded-2xl border border-gray-100 bg-panel">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
            Mostrar resueltos ({resueltos.length})
          </summary>
          <div className="p-4 pt-0 space-y-2">
            {resueltos.map((e) => (
              <div key={e.id} className="rounded-xl border border-gray-100 p-4 opacity-60">
                <p className="text-xs uppercase tracking-wide text-status-neutral font-semibold">{e.type}</p>
                <p className="font-medium text-ink">{e.title}</p>
                <p className="text-xs text-status-neutral mt-0.5">
                  {formatDate(e.startDate)} — {e.endDate ? formatDate(e.endDate) : ''}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Antropometría y signos vitales</h2>
        <AnthropometryForm observables={observables} />
        <AnthropometryHistory history={history} />
      </section>
    </div>
  )
}
