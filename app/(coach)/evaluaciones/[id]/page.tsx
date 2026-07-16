import Link from 'next/link'
import { getAssessmentResults } from '@/domains/assessments/queries'
import { createServerClient } from '@/lib/supabase/server'
import { formatMark } from '@/lib/format-mark'

export const dynamic = 'force-dynamic'

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: assessment } = await supabase
    .from('assessments')
    .select('title, date, notes, memberships!assessments_athlete_membership_id_fkey(people(first_name, last_name)), protocols(name)')
    .eq('id', id)
    .maybeSingle()

  const results = await getAssessmentResults(id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = assessment as any
  const athleteName = row?.memberships?.people ? `${row.memberships.people.first_name} ${row.memberships.people.last_name}` : '—'

  return (
    <div className="space-y-6">
      <div>
        <Link href="/evaluaciones" className="text-xs text-status-neutral hover:text-ink">
          ← Volver a evaluaciones
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink mt-2">{row?.title}</h1>
        <p className="text-xs text-status-neutral">
          {athleteName} · {row?.date ? formatDate(row.date) : ''}
          {row?.protocols?.name ? ` · ${row.protocols.name}` : ''}
        </p>
      </div>

      {row?.notes && (
        <div className="rounded-xl border border-outline bg-panel p-4 text-sm text-ink">{row.notes}</div>
      )}

      <div className="rounded-xl border border-outline bg-panel divide-y divide-outline">
        <p className="p-3 text-sm font-semibold text-ink">Resultados</p>
        {results.length === 0 && <p className="p-4 text-sm text-status-neutral">Sin resultados cargados.</p>}
        {results.map((r) => (
          <div key={r.id} className="p-3 flex items-center justify-between text-sm">
            <p className="text-ink">{r.observableName}</p>
            <p className="font-medium text-ink">
              {formatMark(r.value, r.unitSymbol)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
