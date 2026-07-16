import { getMyActiveMembership, getAthletesForCoach, getRoster, getGroups } from '@/domains/athletes/queries'
import { getReportData } from '@/domains/reports/queries'
import { formatMark } from '@/lib/format-mark'

export const dynamic = 'force-dynamic'

const SOURCE_LABELS: Record<string, string> = {
  competencia: 'Competencia',
  entrenamiento: 'Entrenamiento',
  assessment: 'Evaluación',
  manual: 'Manual',
  checkin: 'Check-in',
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ atleta?: string; grupo?: string; desde?: string; hasta?: string; origen?: string }>
}) {
  const params = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [roster, groups] = await Promise.all([
    (membership.role === 'manager' ? getRoster(membership.organizationId) : getAthletesForCoach(membership.id)),
    getGroups(membership.organizationId),
  ])

  const rows = await getReportData({
    organizationId: membership.organizationId,
    athleteMembershipId: params.atleta || undefined,
    groupId: params.grupo || undefined,
    desde: params.desde || undefined,
    hasta: params.hasta || undefined,
    sourceType: params.origen || undefined,
  })

  const downloadHref = `/api/reportes?${new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][]
  ).toString()}`

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Reportes</p>
        <h1 className="font-display text-2xl font-bold text-ink">Reportes y exportación</h1>
      </div>

      <form className="rounded-xl border border-outline bg-panel p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 items-end">
        <div>
          <label className="text-xs text-status-neutral block mb-1">Atleta</label>
          <select name="atleta" defaultValue={params.atleta ?? ''} className="w-full rounded-lg border border-outline bg-panel text-ink px-2 py-1.5 text-sm">
            <option value="">Todos</option>
            {roster.map((r) => (
              <option key={r.id} value={r.id}>
                {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
              </option>
            ))}
          </select>
        </div>
        {groups.length > 0 && (
          <div>
            <label className="text-xs text-status-neutral block mb-1">Grupo</label>
            <select name="grupo" defaultValue={params.grupo ?? ''} className="w-full rounded-lg border border-outline bg-panel text-ink px-2 py-1.5 text-sm">
              <option value="">Todos</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs text-status-neutral block mb-1">Origen</label>
          <select name="origen" defaultValue={params.origen ?? ''} className="w-full rounded-lg border border-outline bg-panel text-ink px-2 py-1.5 text-sm">
            <option value="">Todos</option>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-status-neutral block mb-1">Desde</label>
          <input type="date" name="desde" defaultValue={params.desde ?? ''} className="w-full rounded-lg border border-outline bg-panel text-ink px-2 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-status-neutral block mb-1">Hasta</label>
          <input type="date" name="hasta" defaultValue={params.hasta ?? ''} className="w-full rounded-lg border border-outline bg-panel text-ink px-2 py-1.5 text-sm" />
        </div>
        <button type="submit" className="btn-primary px-4 py-1.5 text-sm h-fit">
          Filtrar
        </button>
      </form>

      <div className="flex items-center justify-between">
        <p className="text-sm text-status-neutral">{rows.length} registros</p>
        <a href={downloadHref} className="rounded-lg bg-status-positive text-white px-4 py-2 text-sm font-medium">
          ⬇ Descargar Excel
        </a>
      </div>

      <div className="rounded-xl border border-outline bg-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline text-left text-xs text-status-neutral">
              <th className="p-2">Fecha</th>
              <th className="p-2">Atleta</th>
              <th className="p-2">Prueba</th>
              <th className="p-2">Valor</th>
              <th className="p-2">Origen</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 100).map((r, i) => (
              <tr key={i} className="border-b border-outline">
                <td className="p-2 text-xs text-status-neutral">{formatDate(r.date)}</td>
                <td className="p-2 text-ink">{r.athleteName}</td>
                <td className="p-2 text-ink">{r.observableName}</td>
                <td className="p-2 font-medium text-ink">
                  {formatMark(r.value, r.unitSymbol)}
                </td>
                <td className="p-2 text-xs text-status-neutral">{SOURCE_LABELS[r.sourceType] ?? r.sourceType}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 100 && (
          <p className="p-3 text-xs text-status-neutral text-center">
            Mostrando los primeros 100 de {rows.length} — descargá el Excel para verlos todos.
          </p>
        )}
        {rows.length === 0 && <p className="p-6 text-center text-sm text-status-neutral">Sin registros para estos filtros.</p>}
      </div>
    </div>
  )
}
