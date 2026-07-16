import { getMyActiveMembership, getAthletesForCoach, getRoster } from '@/domains/athletes/queries'
import { getSports, getObservables, getUnits, getHiddenObservables } from '@/domains/catalog/queries'
import { getRecentRecords } from '@/domains/observations/manual-entry'
import { RecordForm } from './record-form'
import { ObservableForm } from './observable-form'
import { HideButton, UnhideButton } from './hide-button'
import { EditableRecordRow } from '@/components/ui/editable-record-row'
import { editRecordAction, deleteRecordAction } from './actions'

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
    (membership.role === 'manager' ? getRoster(membership.organizationId) : getAthletesForCoach(membership.id)),
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
        <h1 className="font-display text-2xl font-bold text-ink">Cargar un resultado</h1>
      </div>

      <RecordForm
        roster={roster}
        observables={registrableObservables.map((o) => ({ id: o.id, name: o.name, unitSymbol: unitById.get(o.unitId)?.symbol ?? null }))}
      />

      <details className="text-sm">
        <summary className="cursor-pointer text-ink underline">¿No está en la lista? Agregar una prueba nueva</summary>
        <div className="mt-2">
          <ObservableForm sports={sports} units={units} />
        </div>
      </details>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Últimos registros</h2>
        {recent.length === 0 && (
          <div className="rounded-xl border border-outline bg-panel p-4 text-sm text-status-neutral">
            Todavía no hay nada cargado acá.
          </div>
        )}
        <div className="rounded-xl border border-outline bg-panel divide-y divide-outline">
          {recent.map((r) => (
            <EditableRecordRow
              key={r.id}
              id={r.id}
              title={r.athleteName}
              subtitle={`${r.observableName} · ${formatDate(r.date)}`}
              value={r.value}
              unitSymbol={r.unitSymbol}
              onEdit={editRecordAction}
              onDelete={deleteRecordAction}
            />
          ))}
        </div>
      </section>

      <details className="rounded-xl border border-outline bg-panel">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
          Catálogo de marcas ({registrableObservables.length} ítems) — avanzado
        </summary>
        <div className="p-4 pt-0 space-y-6">
          {isManager && (
            <div className="pt-4">
              <ObservableForm sports={sports} units={units} />
            </div>
          )}

          {sports.map((sport) => {
            const items = registrableObservables.filter((o) => o.sportId === sport.id)
            if (items.length === 0) return null

            return (
              <div key={sport.id} className="space-y-2">
                <h3 className="text-xs font-semibold text-status-neutral uppercase">{sport.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((obs) => (
                    <div key={obs.id} className="rounded-lg border border-outline p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-ink text-sm">{obs.name}</p>
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
                    <div key={obs.id} className="rounded-lg border border-outline p-3">
                      <p className="font-medium text-ink text-sm">{obs.name}</p>
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
