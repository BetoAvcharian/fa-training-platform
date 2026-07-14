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
        <h1 className="font-display text-2xl font-bold text-navy">Mi salud</h1>
        <p className="text-xs text-status-neutral mt-1">
          Solo vos y tu entrenador pueden ver esto.
        </p>
      </div>

      <HealthForm gender={profile?.gender ?? null} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-navy">Activos</h2>
        {activos.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-status-neutral">
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
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">Resueltos</h2>
          <div className="space-y-2">
            {resueltos.map((e) => (
              <div key={e.id} className="rounded-2xl border border-gray-100 bg-white p-4 opacity-60">
                <p className="text-xs uppercase tracking-wide text-status-neutral font-semibold">{e.type}</p>
                <p className="font-medium text-navy">{e.title}</p>
                <p className="text-xs text-status-neutral mt-0.5">
                  {formatDate(e.startDate)} — {e.endDate ? formatDate(e.endDate) : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-navy">Antropometría y signos vitales</h2>
        <AnthropometryForm observables={observables} />
        <AnthropometryHistory history={history} />
      </section>
    </div>
  )
}
