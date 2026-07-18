import { getMyActiveMembership, getAthletesForCoach, getRoster, getGroups, getGroupMembers } from '@/domains/athletes/queries'
import { getObservables } from '@/domains/catalog/queries'
import { compareAthletes, computeGroupAverage } from '@/domains/performance/queries'
import { CompareChart, DualCompareChart } from '../compare-chart'
import { FullscreenChart } from '@/components/ui/fullscreen-chart'
import { compareAction } from './actions'

export const dynamic = 'force-dynamic'

const SOURCE_OPTIONS = [
  { value: 'entrenamiento', label: 'Entrenamiento' },
  { value: 'competencia', label: 'Competencia' },
  { value: 'assessment', label: 'Evaluación' },
  { value: 'manual', label: 'Manual' },
]

export default async function CompararPage({
  searchParams,
}: {
  searchParams: Promise<{
    observableIds?: string
    groupId?: string
    athletes?: string
    desde?: string
    hasta?: string
    oficiales?: string
    origenes?: string
  }>
}) {
  const params = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [roster, groups, observables] = await Promise.all([
    (membership.role === 'manager' ? getRoster(membership.organizationId) : getAthletesForCoach(membership.id)),
    getGroups(membership.organizationId),
    getObservables(membership.organizationId),
  ])

  const performanceObservables = observables.filter((o) => o.isPerformance)

  let athleteIds: string[] = params.athletes ? params.athletes.split(',').filter(Boolean) : []
  if (params.groupId && athleteIds.length === 0) {
    const members = await getGroupMembers(params.groupId)
    athleteIds = members.map((m) => m.id)
  }

  const origenesSeleccionados = params.origenes ? params.origenes.split(',').filter(Boolean) : []
  const selectedObservableIds = params.observableIds ? params.observableIds.split(',').filter(Boolean) : []
  const showResult = selectedObservableIds.length > 0 && athleteIds.length >= 2

  const charts: Array<{ observableName: string; chartData: Array<{ date: string; [key: string]: string | number }>; athleteNames: string[] }> = []
  let dualChart: {
    labelA: string
    labelB: string
    chartData: Array<{ date: string; [key: string]: string | number }>
    seriesA: string[]
    seriesB: string[]
  } | null = null

  if (showResult && selectedObservableIds.length === 2) {
    const [obsA, obsB] = selectedObservableIds
    const observableA = performanceObservables.find((o) => o.id === obsA)
    const observableB = performanceObservables.find((o) => o.id === obsB)
    const [seriesResA, seriesResB] = await Promise.all(
      [obsA, obsB].map((observableId) =>
        compareAthletes({
          organizationId: membership.organizationId,
          athleteMembershipIds: athleteIds,
          observableId,
          from: params.desde || undefined,
          to: params.hasta || undefined,
          officialOnly: params.oficiales === '1',
          sourceTypes: origenesSeleccionados.length > 0 ? origenesSeleccionados : undefined,
        })
      )
    )

    const labelA = observableA?.name ?? '—'
    const labelB = observableB?.name ?? '—'
    const seriesA = seriesResA.map((s) => `${s.athleteName} (${labelA})`)
    const seriesB = seriesResB.map((s) => `${s.athleteName} (${labelB})`)

    const allDates = Array.from(
      new Set([...seriesResA.flatMap((s) => s.points.map((p) => p.date)), ...seriesResB.flatMap((s) => s.points.map((p) => p.date))])
    ).sort()

    const chartData = allDates.map((date) => {
      const row: { date: string; [key: string]: string | number } = { date }
      for (const s of seriesResA) {
        const point = s.points.find((p) => p.date === date)
        if (point) row[`${s.athleteName} (${labelA})`] = point.value
      }
      for (const s of seriesResB) {
        const point = s.points.find((p) => p.date === date)
        if (point) row[`${s.athleteName} (${labelB})`] = point.value
      }
      return row
    })

    dualChart = { labelA, labelB, chartData, seriesA, seriesB }
  } else if (showResult) {
    for (const observableId of selectedObservableIds) {
      const observable = performanceObservables.find((o) => o.id === observableId)
      const series = await compareAthletes({
        organizationId: membership.organizationId,
        athleteMembershipIds: athleteIds,
        observableId,
        from: params.desde || undefined,
        to: params.hasta || undefined,
        officialOnly: params.oficiales === '1',
        sourceTypes: origenesSeleccionados.length > 0 ? origenesSeleccionados : undefined,
      })
      const athleteNames = series.map((s) => s.athleteName)
      const average = computeGroupAverage(series)
      const averageByDate = new Map(average.map((a) => [a.date, a.average]))

      const allDates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort()
      const chartData = allDates.map((date) => {
        const row: { date: string; [key: string]: string | number } = { date }
        for (const s of series) {
          const point = s.points.find((p) => p.date === date)
          if (point) row[s.athleteName] = point.value
        }
        const avg = averageByDate.get(date)
        if (avg !== undefined) row['Promedio'] = Math.round(avg * 100) / 100
        return row
      })

      charts.push({ observableName: observable?.name ?? '—', chartData, athleteNames })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Rendimiento</p>
        <h1 className="font-display text-2xl font-bold text-ink">Comparar atletas / grupo</h1>
      </div>

      <form action={compareAction} className="rounded-xl border border-outline bg-panel p-4 space-y-3 max-w-lg">
        <div>
          <p className="text-xs text-status-neutral mb-1">Prueba/ejercicio (podés elegir más de una)</p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {performanceObservables.map((o) => (
              <label key={o.id} className="flex items-center gap-1 text-xs bg-outline/40 rounded-full px-2 py-1">
                <input type="checkbox" name="observableIds" value={o.id} defaultChecked={selectedObservableIds.includes(o.id)} />
                {o.name}
              </label>
            ))}
          </div>
        </div>

        {groups.length > 0 && (
          <select name="groupId" defaultValue={params.groupId ?? ''} className="input-field">
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
              <label key={r.id} className="flex items-center gap-1 text-xs bg-outline/40 rounded-full px-2 py-1">
                <input type="checkbox" name="athleteIds" value={r.id} defaultChecked={athleteIds.includes(r.id)} />
                {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input name="desde" type="date" defaultValue={params.desde ?? ''} className="input-field flex-1" placeholder="Desde" />
          <input name="hasta" type="date" defaultValue={params.hasta ?? ''} className="input-field flex-1" placeholder="Hasta" />
        </div>

        <div>
          <p className="text-xs text-status-neutral mb-1">Origen (vacío = todos)</p>
          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-1 text-xs bg-outline/40 rounded-full px-2 py-1">
                <input type="checkbox" name="origenes" value={opt.value} defaultChecked={origenesSeleccionados.includes(opt.value)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" name="soloOficiales" value="1" defaultChecked={params.oficiales === '1'} />
          Solo resultados oficiales
        </label>

        <button type="submit" className="btn-primary px-4 py-2 text-sm">
          Comparar
        </button>
      </form>

      {showResult && (
        <div className="space-y-4">
          {dualChart ? (
            <div className="card p-4">
              <p className="text-sm font-semibold text-ink mb-2">
                {dualChart.labelA} <span className="text-status-neutral font-normal">(línea sólida)</span> vs {dualChart.labelB}{' '}
                <span className="text-status-neutral font-normal">(línea punteada)</span>
              </p>
              {dualChart.chartData.length === 0 ? (
                <p className="text-sm text-status-neutral">Sin datos todavía para esta combinación.</p>
              ) : (
                <FullscreenChart title={`${dualChart.labelA} vs ${dualChart.labelB}`}>
                  <DualCompareChart
                    data={dualChart.chartData}
                    seriesA={dualChart.seriesA}
                    seriesB={dualChart.seriesB}
                    labelA={dualChart.labelA}
                    labelB={dualChart.labelB}
                  />
                </FullscreenChart>
              )}
            </div>
          ) : (
            <>
              {charts.length === 0 && (
                <div className="card p-4">
                  <p className="text-sm text-status-neutral">Sin datos todavía para esta combinación.</p>
                </div>
              )}
              {charts.map((c) => (
                <div key={c.observableName} className="card p-4">
                  <p className="text-sm font-semibold text-ink mb-2">{c.observableName}</p>
                  {c.chartData.length === 0 ? (
                    <p className="text-sm text-status-neutral">Sin datos todavía para esta prueba.</p>
                  ) : (
                    <FullscreenChart title={c.observableName}>
                      <CompareChart data={c.chartData} athleteNames={c.athleteNames} />
                    </FullscreenChart>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
