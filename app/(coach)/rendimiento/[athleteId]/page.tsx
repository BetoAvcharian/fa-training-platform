import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getAthleteRecords, getAthleteResults } from '@/domains/performance/queries'
import { createServerClient } from '@/lib/supabase/server'
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

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AthleteRendimientoPage({
  params,
}: {
  params: Promise<{ athleteId: string }>
}) {
  const { athleteId } = await params
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const supabase = await createServerClient()
  const { data: athlete } = await supabase
    .from('memberships')
    .select('id, people(first_name, last_name)')
    .eq('id', athleteId)
    .maybeSingle()

  const [records, results] = await Promise.all([
    getAthleteRecords(athleteId, membership.organizationId, supabase),
    getAthleteResults(athleteId, membership.organizationId, 50, supabase),
  ])

  const athleteName = (athlete as any)?.people
    ? `${(athlete as any).people.first_name} ${(athlete as any).people.last_name}`
    : 'Atleta'

  const oficiales = records.filter((r) => r.recordType === 'oficial')

  return (
    <div className="space-y-6">
      <div>
        <Link href="/rendimiento" className="text-xs text-status-neutral hover:text-navy">
          ← Volver a atletas
        </Link>
        <p className="text-xs uppercase tracking-wider text-gold font-medium mt-2">Rendimiento</p>
        <h1 className="font-display text-2xl font-bold text-navy">{athleteName}</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-navy">Récords oficiales</h2>
        {oficiales.length === 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-status-neutral">
            Sin récords oficiales todavía.
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {oficiales.map((r) => (
            <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="font-medium text-navy text-sm">{r.observableName}</p>
                <p className="text-xs text-status-neutral">{formatDate(r.achievedDate)}</p>
              </div>
              <p className="font-display font-bold text-navy">
                {formatMark(r.value, r.unitSymbol)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-navy">Todos los resultados</h2>
        {results.length === 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-status-neutral">
            Sin resultados cargados todavía.
          </div>
        )}
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
          {results.map((row) => (
            <div key={row.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-navy text-sm">{row.observableName}</p>
                <p className="text-xs text-status-neutral">
                  {formatDate(row.date)} · {SOURCE_LABELS[row.sourceType] ?? row.sourceType}
                </p>
              </div>
              <p className="font-semibold text-navy">
                {formatMark(row.value, row.unitSymbol)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
