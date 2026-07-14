import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getObservables, getUnits, getSports } from '@/domains/catalog/queries'
import { getAthleteResults } from '@/domains/performance/queries'
import { MyRecordForm } from './record-form'
import { MyObservableForm } from './observable-form'

export const dynamic = 'force-dynamic'

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

export default async function MisRegistrosPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [observables, units, recent, sports] = await Promise.all([
    getObservables(membership.organizationId),
    getUnits(membership.organizationId),
    getAthleteResults(membership.id, membership.organizationId, 20),
    getSports(membership.organizationId),
  ])

  const unitById = new Map(units.map((u) => [u.id, u]))
  const registrable = observables
    .filter((o) => !o.tags?.includes('antropometria') && !o.tags?.includes('signos_vitales') && !o.tags?.includes('checkin'))
    .map((o) => ({ id: o.id, name: o.name, unitSymbol: unitById.get(o.unitId)?.symbol ?? null }))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Registros</p>
        <h1 className="font-display text-2xl font-bold text-navy">Cargar una marca</h1>
      </div>

      <MyRecordForm observables={registrable} />

      <details className="text-sm">
        <summary className="cursor-pointer text-navy underline">¿No está en la lista? Agregar una prueba nueva</summary>
        <div className="mt-2">
          <MyObservableForm sports={sports} units={units} />
        </div>
      </details>

      <div>
        <p className="text-xs text-status-neutral uppercase tracking-wide mb-2">Últimos registros</p>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
          {recent.length === 0 && <p className="p-4 text-sm text-status-neutral">Todavía no cargaste nada.</p>}
          {recent.map((r) => (
            <div key={r.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <p className="text-navy">{r.observableName}</p>
                <p className="text-xs text-status-neutral">{formatDate(r.date)}</p>
              </div>
              <p className="font-medium text-navy">
                {r.value}
                {r.unitSymbol ? ` ${r.unitSymbol}` : ''}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
