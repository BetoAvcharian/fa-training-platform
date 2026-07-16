import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getObservables, getUnits, getSports } from '@/domains/catalog/queries'
import { getMyResults } from '@/domains/performance/queries'
import { MyRecordForm } from './record-form'
import { MyObservableForm } from './observable-form'
import { EditableRecordRow } from '@/components/ui/editable-record-row'
import { editMyRecordAction, deleteMyRecordAction } from './actions'

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
    getMyResults(20),
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
        <h1 className="font-display text-2xl font-bold text-ink">Cargar una marca</h1>
      </div>

      <MyRecordForm observables={registrable} />

      <details className="text-sm">
        <summary className="cursor-pointer text-ink underline">¿No está en la lista? Agregar una prueba nueva</summary>
        <div className="mt-2">
          <MyObservableForm sports={sports} units={units} />
        </div>
      </details>

      <div>
        <p className="text-xs text-status-neutral uppercase tracking-wide mb-2">Últimos registros</p>
        <div className="rounded-2xl border border-gray-100 bg-panel shadow-sm divide-y divide-gray-50">
          {recent.length === 0 && <p className="p-4 text-sm text-status-neutral">Todavía no cargaste nada.</p>}
          {recent.map((r) => (
            <EditableRecordRow
              key={r.id}
              id={r.id}
              title={r.observableName}
              subtitle={formatDate(r.date)}
              value={r.value}
              unitSymbol={r.unitSymbol}
              onEdit={editMyRecordAction}
              onDelete={deleteMyRecordAction}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
