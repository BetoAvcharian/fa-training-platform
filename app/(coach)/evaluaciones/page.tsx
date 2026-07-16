import Link from 'next/link'
import { getMyActiveMembership, getAthletesForCoach, getRoster } from '@/domains/athletes/queries'
import { getAssessments, getProtocols } from '@/domains/assessments/queries'
import { getObservables } from '@/domains/catalog/queries'
import { AssessmentForm } from './assessment-form'
import { ProtocolForm } from './protocol-form'
import { ProtocolChip } from './protocol-chip'

export const dynamic = 'force-dynamic'

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function EvaluacionesPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [assessments, protocols, roster, observables] = await Promise.all([
    getAssessments(membership.organizationId),
    getProtocols(membership.organizationId),
    (membership.role === 'manager' ? getRoster(membership.organizationId) : getAthletesForCoach(membership.id)),
    getObservables(membership.organizationId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Evaluaciones</p>
          <h1 className="font-display text-2xl font-bold text-ink">Evaluaciones formales</h1>
        </div>
        <div className="flex items-center gap-3">
          <ProtocolForm observables={observables.map((o) => ({ id: o.id, name: o.name }))} />
          <AssessmentForm
            roster={roster}
            protocols={protocols}
            observables={observables.map((o) => ({ id: o.id, name: o.name, unitSymbol: null }))}
          />
        </div>
      </div>

      {protocols.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-ink mb-2">Protocolos</p>
          <div className="flex flex-wrap gap-2">
            {protocols.map((p) => (
              <ProtocolChip key={p.id} id={p.id} name={p.name} deletable={p.organizationId !== null} />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {assessments.length === 0 && (
          <div className="rounded-xl border border-outline bg-panel p-6 text-center text-sm text-status-neutral">
            Sin evaluaciones cargadas todavía.
          </div>
        )}
        {assessments.map((a) => (
          <Link key={a.id} href={`/evaluaciones/${a.id}`} className="block rounded-xl border border-outline bg-panel p-4 hover:border-gold/40">
            <div className="flex items-center justify-between">
              <p className="font-medium text-ink">{a.title}</p>
              <span className="text-xs text-status-neutral">{formatDate(a.date)}</span>
            </div>
            <p className="text-xs text-status-neutral">{a.athleteName}{a.protocolName ? ` · ${a.protocolName}` : ''}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
