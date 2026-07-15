import { getMyRecords, getMyResults } from '@/domains/performance/queries'
import { formatMark } from '@/lib/format-mark'

export const dynamic = 'force-dynamic'

const SOURCE_LABELS: Record<string, string> = {
  competencia: 'Competencia',
  entrenamiento: 'Entrenamiento',
  assessment: 'Evaluación',
  wearable: 'Wearable',
  manual: 'Manual',
  importacion: 'Importado',
  checkin: 'Check-in',
}

const VALIDATION_LABELS: Record<string, string> = {
  no_verificado: 'Sin verificar',
  verificado: 'Verificado',
  oficial: 'Oficial',
  importado_sin_validar: 'Importado (sin validar)',
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MiRendimientoPage() {
  const [records, results] = await Promise.all([getMyRecords(), getMyResults()])

  const oficiales = records.filter((r) => r.recordType === 'oficial')
  const entrenamiento = records.filter((r) => r.recordType === 'entrenamiento')

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Rendimiento</p>
        <h1 className="font-display text-2xl font-bold text-navy">Mi rendimiento</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-navy">Récords oficiales</h2>
        {oficiales.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-status-neutral">
            Todavía no tenés récords oficiales cargados.
          </div>
        )}
        <div className="space-y-2">
          {oficiales.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-medium text-navy">{r.observableName}</p>
                <p className="text-xs text-status-neutral">{formatDate(r.achievedDate)}</p>
              </div>
              <p className="font-display font-bold text-navy tabular-nums">{formatMark(r.value, r.unitSymbol)}</p>
            </div>
          ))}
        </div>
      </section>

      {entrenamiento.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">Récords de entrenamiento</h2>
          <div className="space-y-2">
            {entrenamiento.map((r) => (
              <div key={r.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy">{r.observableName}</p>
                  <p className="text-xs text-status-neutral">{formatDate(r.achievedDate)}</p>
                </div>
                <p className="font-display font-bold text-navy tabular-nums">{formatMark(r.value, r.unitSymbol)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-navy">Todos los resultados</h2>
        {results.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-status-neutral">
            Todavía no hay resultados cargados.
          </div>
        )}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
          {results.map((row) => (
            <div key={row.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-navy text-sm">{row.observableName}</p>
                <p className="text-xs text-status-neutral">
                  {formatDate(row.date)} · {SOURCE_LABELS[row.sourceType] ?? row.sourceType}
                  {row.validationStatus !== 'no_verificado' && (
                    <> · {VALIDATION_LABELS[row.validationStatus] ?? row.validationStatus}</>
                  )}
                </p>
              </div>
              <p className="font-display font-semibold text-navy tabular-nums">{formatMark(row.value, row.unitSymbol)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
