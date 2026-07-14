import { getMyActiveMembership, getRoster } from '@/domains/athletes/queries'
import { getSports, getObservables, getUnits, getHiddenObservables } from '@/domains/catalog/queries'
import { getRecentRecords } from '@/domains/observations/manual-entry'
import { RecordForm } from './record-form'
import { ObservableForm } from './observable-form'
import { HideButton, UnhideButton } from './hide-button'

export const dynamic = 'force-dynamic'

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default async function RegistrosPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [sports, observables, units, roster, recent, hidden] = await Promise.all([
    getSports(membership.organizationId),
    getObservables(membership.organizationId),
    getUnits(membership.organizationId),
    getRoster(membership.organizationId),
    getRecentRecords(membership.organizationId),
    getHiddenObservables(membership.organizationId),
  ])

  const unitById = new Map(units.map((u) => [u.id, u]))
  const sportById = new Map(sports.map((s) => [s.id, s]))
  const isManager = membership.role === 'manager'

  // Peso, talla, frecuencia cardíaca, etc. ya tienen su lugar en Salud —
  // y energía/fatiga/molestia son del check-in diario del atleta, no
  // algo que el coach "registra" acá — no tiene sentido que aparezcan
  // mezcladas con marcas deportivas.
  const registrableObservables = observables.filter(
    (o) =>
      !o.tags?.includes('antropometria') &&
      !o.tags?.includes('signos_vitales') &&
      !o.tags?.includes('checkin')
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Registros</p>
        <h1 className="font-display text-2xl font-bold text-navy">Cargar un resultado</h1>
      </div>

      <RecordForm
        roster={roster}
        observables={registrableObservables.map((o) => ({ id: o.id, name: o.name, unitSymbol: unitById.get(o.unitId)?.symbol ?? null }))}
      />

      <details className="text-sm">
        <summary className="cursor-pointer text-navy underline">¿No está en la lista? Agregar una prueba nueva</summary>
        <div className="mt-2">
          <ObservableForm sports={sports} units={units} />
        </div>
      </details>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-navy">Últimos registros</h2>
        {recent.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-status-neutral">
            Todavía no hay nada cargado acá.
          </div>
        )}
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {recent.map((r) => (
            <div key={r.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <p className="text-navy font-medium">{r.athleteName}</p>
                <p className="text-xs text-status-neutral">
                  {r.observableName} · {formatDate(r.date)}
                </p>
              </div>
              <p className="font-semibold text-navy">
                {r.value}
                {r.unitSymbol ? ` ${r.unitSymbol}` : ''}
              </p>
            </div>
          ))}
        </div>
      </section>

      <details className="rounded-xl border border-gray-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-navy">
          Catálogo completo ({observables.length} ítems) — avanzado
        </summary>
        <div className="p-4 pt-0 space-y-6">
          {isManager && (
            <div className="pt-4">
              <ObservableForm sports={sports} units={units} />
            </div>
          )}

          {sports.map((sport) => {
            const items = observables.filter((o) => o.sportId === sport.id)
            if (items.length === 0) return null

            return (
              <div key={sport.id} className="space-y-2">
                <h3 className="text-xs font-semibold text-status-neutral uppercase">{sport.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((obs) => (
                    <div key={obs.id} className="rounded-lg border border-gray-100 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-navy text-sm">{obs.name}</p>
                          <p className="text-xs text-status-neutral">
                            {unitById.get(obs.unitId)?.symbol ?? ''}
                            {obs.isPerformance ? ' · récord' : ''}
                          </p>
                        </div>
                        {isManager && !obs.organizationId && <HideButton id={obs.id} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {observables.filter((o) => !sportById.has(o.sportId)).length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-status-neutral uppercase">General</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {observables
                  .filter((o) => !sportById.has(o.sportId))
                  .map((obs) => (
                    <div key={obs.id} className="rounded-lg border border-gray-100 p-3">
                      <p className="font-medium text-navy text-sm">{obs.name}</p>
                      <p className="text-xs text-status-neutral">{unitById.get(obs.unitId)?.symbol ?? ''}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {isManager && hidden.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-status-neutral uppercase">Ocultos</h3>
              <div className="space-y-1">
                {hidden.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-sm">
                    <span className="text-status-neutral">{h.name}</span>
                    <UnhideButton id={h.id} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
