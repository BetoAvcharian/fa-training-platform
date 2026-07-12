import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getSports, getObservables, getUnits } from '@/domains/catalog/queries'

export const dynamic = 'force-dynamic'

export default async function BibliotecaPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [sports, observables, units] = await Promise.all([
    getSports(membership.organizationId),
    getObservables(membership.organizationId),
    getUnits(membership.organizationId),
  ])

  const unitById = new Map(units.map((u) => [u.id, u]))
  const sportById = new Map(sports.map((s) => [s.id, s]))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Biblioteca</p>
        <h1 className="font-display text-2xl font-bold text-navy">Ejercicios y pruebas</h1>
        <p className="text-xs text-status-neutral mt-1">
          {observables.length} ítems del catálogo{membership.role !== 'manager' ? ' — solo lectura' : ''}
        </p>
      </div>

      {sports.map((sport) => {
        const items = observables.filter((o) => o.sportId === sport.id)
        if (items.length === 0) return null

        return (
          <section key={sport.id} className="space-y-3">
            <h2 className="text-sm font-semibold text-navy">{sport.name}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map((obs) => (
                <div key={obs.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-navy text-sm">{obs.name}</p>
                    {obs.isPerformance && (
                      <span className="text-[10px] uppercase tracking-wide text-gold font-semibold shrink-0">
                        Récord
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-status-neutral mt-1">
                    {unitById.get(obs.unitId)?.symbol ?? ''}
                    {obs.muscleGroup ? ` · ${obs.muscleGroup}` : ''}
                    {obs.equipment ? ` · ${obs.equipment}` : ''}
                  </p>
                  {obs.description && <p className="text-sm text-navy mt-2">{obs.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {observables.filter((o) => !sportById.has(o.sportId)).length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">General</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {observables
              .filter((o) => !sportById.has(o.sportId))
              .map((obs) => (
                <div key={obs.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <p className="font-medium text-navy text-sm">{obs.name}</p>
                  <p className="text-xs text-status-neutral mt-1">{unitById.get(obs.unitId)?.symbol ?? ''}</p>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  )
}
