import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getObservables } from '@/domains/catalog/queries'
import { getWaPointsRanking } from '@/domains/performance/queries'

export const dynamic = 'force-dynamic'

const GENDER_LABELS: Record<string, string> = { masculino: 'Masculino', femenino: 'Femenino' }

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ genero?: string; prueba?: string; anio?: string }>
}) {
  const params = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const currentYear = new Date().getFullYear()
  const year = params.anio ? parseInt(params.anio, 10) : currentYear

  const [observables, ranking] = await Promise.all([
    getObservables(membership.organizationId),
    getWaPointsRanking({
      organizationId: membership.organizationId,
      gender: params.genero || undefined,
      observableId: params.prueba || undefined,
      year,
    }),
  ])

  const performanceObservables = observables.filter((o) => o.isPerformance)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/rendimiento" className="text-xs text-status-neutral hover:text-ink">
          ← Volver
        </Link>
        <p className="text-xs uppercase tracking-wider text-gold font-medium mt-2">Rendimiento</p>
        <h1 className="font-display text-2xl font-bold text-ink">Ranking por puntos World Athletics</h1>
        <p className="text-xs text-status-neutral mt-1">
          Compara a tus atletas con la misma vara sin importar la prueba — el sistema oficial de puntuación de World Athletics.
        </p>
      </div>

      {/* Filtros — GET simple, sin JS, para no repetir el bug de onChange en Server Component */}
      <form className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-status-neutral mb-1 block">Género</label>
          <select name="genero" defaultValue={params.genero ?? ''} className="input-field">
            <option value="">Todos</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-status-neutral mb-1 block">Prueba</label>
          <select name="prueba" defaultValue={params.prueba ?? ''} className="input-field">
            <option value="">Todas</option>
            {performanceObservables.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-status-neutral mb-1 block">Año</label>
          <input name="anio" type="number" defaultValue={year} className="input-field w-24" />
        </div>
        <button type="submit" className="btn-primary px-4 py-2 text-sm">
          Filtrar
        </button>
      </form>

      {ranking.length === 0 ? (
        <div className="rounded-xl border border-outline bg-panel p-6 text-sm text-status-neutral text-center">
          Sin marcas con puntos World Athletics todavía para este filtro. Se calcula solo en las pruebas estándar de pista y
          campo (todas menos sentadilla y peso muerto, que no son pruebas de World Athletics).
        </div>
      ) : (
        <div className="rounded-xl border border-outline bg-panel divide-y divide-outline overflow-hidden">
          {ranking.map((r, i) => (
            <div key={r.athleteMembershipId} className="p-4 flex items-center gap-4">
              <span className={`font-display text-xl font-bold w-8 text-center ${i === 0 ? 'text-gold' : 'text-status-neutral'}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink truncate">{r.athleteName}</p>
                <p className="text-xs text-status-neutral">
                  {r.observableName} {r.gender ? `· ${GENDER_LABELS[r.gender] ?? r.gender}` : ''}
                </p>
              </div>
              <span className="font-display text-2xl font-bold text-navy">{r.waPoints}</span>
              <span className="text-[10px] text-status-neutral uppercase">pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
