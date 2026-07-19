import { getMyActiveMembership, getAthletesForCoach, getRoster, getGroups } from '@/domains/athletes/queries'
import { getReportData } from '@/domains/reports/queries'
import { formatMark } from '@/lib/format-mark'
import { AthleteSearchPicker } from '@/components/ui/athlete-search-picker'

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

  const trainingsDownloadHref = `/api/reportes/entrenamientos?${new URLSearchParams(
    Object.entries(params).filter(([k, v]) => v && k !== 'origen') as [string, string][]
  ).toString()}`

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Reportes</p>
        <h1 className="font-display text-2xl font-bold text-ink">Reportes y exportación</h1>
      </div>

      <form className="card p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-status-neutral uppercase tracking-wide mb-2">Quién</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-status-neutral block mb-1">Atleta</label>
              <AthleteSearchPicker name="atleta" roster={roster} defaultValue={params.atleta} emptyLabel="Todos" />
            </div>
            {groups.length > 0 && (
              <div>
                <label className="text-xs text-status-neutral block mb-1">Grupo</label>
                <select name="grupo" defaultValue={params.grupo ?? ''} className="input-field">
                  <option value="">Todos</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-outline">
          <p className="text-xs font-semibold text-status-neutral uppercase tracking-wide mb-2">Cuándo y qué</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs text-status-neutral block mb-1">Origen</label>
              <select name="origen" defaultValue={params.origen ?? ''} className="input-field">
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
              <input type="date" name="desde" defaultValue={params.desde ?? ''} className="input-field" />
            </div>
            <div>
              <label className="text-xs text-status-neutral block mb-1">Hasta</label>
              <input type="date" name="hasta" defaultValue={params.hasta ?? ''} className="input-field" />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary px-5 py-2 text-sm">
          Filtrar
        </button>
      </form>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-status-neutral">{rows.length} registros de marcas</p>
        <div className="flex gap-2 flex-wrap">
          <a href={downloadHref} className="rounded-lg bg-status-positive text-white px-4 py-2 text-sm font-medium">
            ⬇ Marcas (Excel)
          </a>
          <a href={trainingsDownloadHref} className="rounded-lg bg-status-positive text-white px-4 py-2 text-sm font-medium">
            ⬇ Entrenamientos planificados (Excel)
          </a>
        </div>
      </div>
      <p className="text-xs text-status-neutral -mt-4">
        Los dos botones usan los mismos filtros de arriba (Atleta, Grupo, Desde, Hasta) — "Origen" solo aplica al de Marcas.
      </p>

      <div className="rounded-xl border border-outline bg-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline text-left">
              <th className="px-4 py-3 text-[11px] uppercase tracking-wide text-status-neutral font-semibold">Fecha</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wide text-status-neutral font-semibold">Atleta</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wide text-status-neutral font-semibold">Prueba</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wide text-status-neutral font-semibold">Valor</th>
              <th className="px-4 py-3 text-[11px] uppercase tracking-wide text-status-neutral font-semibold">Origen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline">
            {rows.slice(0, 100).map((r, i) => (
              <tr key={i} className="hover:bg-navy/[0.03] transition-colors">
                <td className="px-4 py-3 text-xs text-status-neutral whitespace-nowrap">{formatDate(r.date)}</td>
                <td className="px-4 py-3 text-ink">{r.athleteName}</td>
                <td className="px-4 py-3 text-ink">{r.observableName}</td>
                <td className="px-4 py-3 font-semibold text-ink">
                  {formatMark(r.value, r.unitSymbol)}
                </td>
                <td className="px-4 py-3">
                  <span className="badge bg-outline/60 text-status-neutral">{SOURCE_LABELS[r.sourceType] ?? r.sourceType}</span>
                </td>
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
