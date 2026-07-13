import { getMyActiveMembership, getRoster, getGroups, getGroupMembers } from '@/domains/athletes/queries'
import { getObservables } from '@/domains/catalog/queries'
import { compareAthletes, computeGroupAverage } from '@/domains/performance/queries'
import { CompareChart } from '../compare-chart'
import { compareAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{ observableId?: string; groupId?: string; athletes?: string }>
}) {
  const params = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [roster, groups, observables] = await Promise.all([
    getRoster(membership.organizationId),
    getGroups(membership.organizationId),
    getObservables(membership.organizationId),
  ])

  const performanceObservables = observables.filter((o) => o.isPerformance)

  let athleteIds: string[] = params.athletes ? params.athletes.split(',').filter(Boolean) : []
  if (params.groupId && athleteIds.length === 0) {
    const members = await getGroupMembers(params.groupId)
    athleteIds = members.map((m) => m.id)
  }

  const showResult = params.observableId && athleteIds.length >= 2

  let chartData: Array<{ date: string; [key: string]: string | number }> = []
  let athleteNames: string[] = []

  if (showResult) {
    const series = await compareAthletes({
      organizationId: membership.organizationId,
      athleteMembershipIds: athleteIds,
      observableId: params.observableId!,
    })
    athleteNames = series.map((s) => s.athleteName)
    const average = computeGroupAverage(series)
    const averageByDate = new Map(average.map((a) => [a.date, a.average]))

    const allDates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort()
    chartData = allDates.map((date) => {
      const row: Record<string, string | number> = { date }
      for (const s of series) {
        const point = s.points.find((p) => p.date === date)
        if (point) row[s.athleteName] = point.value
      }
      const avg = averageByDate.get(date)
      if (avg !== undefined) row['Promedio'] = Math.round(avg * 100) / 100
      return row
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Rendimiento</p>
        <h1 className="font-display text-2xl font-bold text-navy">Comparar atletas / grupo</h1>
      </div>

      <form action={compareAction} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 max-w-lg">
        <select name="observableId" defaultValue={params.observableId ?? ''} required className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="">Prueba/ejercicio</option>
          {performanceObservables.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>

        {groups.length > 0 && (
          <select name="groupId" defaultValue={params.groupId ?? ''} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">— O elegí un grupo completo —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}

        <div>
          <p className="text-xs text-status-neutral mb-1">O elegí atletas individuales (mín. 2)</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {roster.map((r) => (
              <label key={r.id} className="flex items-center gap-1 text-xs bg-gray-50 rounded-full px-2 py-1">
                <input type="checkbox" name="athleteIds" value={r.id} defaultChecked={athleteIds.includes(r.id)} />
                {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
              </label>
            ))}
          </div>
        </div>

        <button type="submit" className="bg-navy text-white rounded-lg px-4 py-2 text-sm font-medium">
          Comparar
        </button>
      </form>

      {showResult && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          {chartData.length === 0 ? (
            <p className="text-sm text-status-neutral">Sin datos todavía para esta combinación.</p>
          ) : (
            <CompareChart data={chartData} athleteNames={athleteNames} />
          )}
        </div>
      )}
    </div>
  )
}
