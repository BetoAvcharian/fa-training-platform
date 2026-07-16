import Link from 'next/link'
import { getMyActiveMembership, getRoster, getAthletesForCoach } from '@/domains/athletes/queries'
import { getCompetitionEntries } from '@/domains/competitions/queries'
import { getObservables, getUnits } from '@/domains/catalog/queries'
import { createServerClient } from '@/lib/supabase/server'
import { EnrollForm, UnenrollButton, ResultForm } from './forms'
import { formatMark } from '@/lib/format-mark'

export const dynamic = 'force-dynamic'

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const supabase = await createServerClient()
  const { data: event } = await supabase.from('events').select('title, date, location, location_map_url').eq('id', id).maybeSingle()

  const [entries, roster, observables, units] = await Promise.all([
    getCompetitionEntries(id),
    membership.role === 'manager' ? getRoster(membership.organizationId) : getAthletesForCoach(membership.id),
    getObservables(membership.organizationId),
    getUnits(membership.organizationId),
  ])

  const unitById = new Map(units.map((u) => [u.id, u]))
  const performanceObservables = observables
    .filter((o) => o.isPerformance)
    .map((o) => ({ id: o.id, name: o.name, unitSymbol: unitById.get(o.unitId)?.symbol ?? null }))

  const enrolledIds = new Set(entries.map((e) => e.athleteMembershipId))
  const availableRoster = roster.filter((r) => !enrolledIds.has(r.id))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/competencias" className="text-xs text-status-neutral hover:text-navy">
          ← Volver a competencias
        </Link>
        <h1 className="font-display text-2xl font-bold text-navy mt-2">{event?.title ?? 'Competencia'}</h1>
        {event?.date && (
          <p className="text-xs text-status-neutral">
            {new Date(event.date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        )}
        {event?.location && (
          <p className="text-xs text-status-neutral">
            📍{' '}
            {event.location_map_url ? (
              <a href={event.location_map_url} target="_blank" rel="noreferrer" className="underline text-navy">
                {event.location}
              </a>
            ) : (
              event.location
            )}
          </p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 max-w-sm">
        <EnrollForm eventId={id} roster={availableRoster} />
      </div>

      <div className="space-y-2">
        {entries.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-status-neutral">
            Sin atletas inscriptos todavía.
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.athleteMembershipId} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-navy text-sm">{entry.athleteName}</p>
              <UnenrollButton eventId={id} athleteMembershipId={entry.athleteMembershipId} />
            </div>

            {entry.results.length > 0 && (
              <div className="mt-2 space-y-1">
                {entry.results.map((r) => (
                  <p key={r.id} className="text-xs text-status-neutral">
                    {r.observableName}: <span className="font-medium text-navy">{formatMark(r.value, r.unitSymbol)}</span>
                    {r.windMs !== null && <span> (viento {r.windMs > 0 ? '+' : ''}{r.windMs} m/s)</span>}
                  </p>
                ))}
              </div>
            )}

            <div className="mt-2">
              <ResultForm eventId={id} athleteMembershipId={entry.athleteMembershipId} observables={performanceObservables} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
