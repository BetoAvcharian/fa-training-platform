import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getCompetitionEntries } from '@/domains/competitions/queries'
import { getObservables, getUnits } from '@/domains/catalog/queries'
import { createServerClient } from '@/lib/supabase/server'
import { formatMark } from '@/lib/format-mark'
import { SelfEnrollButton, MyResultForm } from './forms'

export const dynamic = 'force-dynamic'

export default async function CompetitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const supabase = await createServerClient()
  const { data: event } = await supabase
    .from('events')
    .select('title, date, location, location_map_url')
    .eq('id', id)
    .maybeSingle()

  const [entries, observables, units] = await Promise.all([
    getCompetitionEntries(id),
    getObservables(membership.organizationId),
    getUnits(membership.organizationId),
  ])

  const unitById = new Map(units.map((u) => [u.id, u]))
  const performanceObservables = observables
    .filter((o) => o.isPerformance)
    .map((o) => ({ id: o.id, name: o.name, unitSymbol: unitById.get(o.unitId)?.symbol ?? null }))

  const myEntry = entries.find((e) => e.athleteMembershipId === membership.id)
  const isEnrolled = !!myEntry
  const otherEntries = entries.filter((e) => e.athleteMembershipId !== membership.id)

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

      <div className="card p-4">
        <SelfEnrollButton eventId={id} enrolled={isEnrolled} />
        {isEnrolled && <MyResultForm eventId={id} observables={performanceObservables} />}
        {isEnrolled && myEntry && myEntry.results.length > 0 && (
          <div className="mt-3 space-y-1">
            {myEntry.results.map((r) => (
              <p key={r.id} className="text-xs text-status-neutral">
                {r.observableName}: <span className="font-medium text-navy">{formatMark(r.value, r.unitSymbol)}</span>
                {r.windMs !== null && <span> (viento {r.windMs > 0 ? '+' : ''}{r.windMs} m/s)</span>}
              </p>
            ))}
          </div>
        )}
      </div>

      {otherEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-status-neutral uppercase tracking-wide">Otros anotados</p>
          {otherEntries.map((entry) => (
            <div key={entry.athleteMembershipId} className="card p-4">
              <p className="font-medium text-navy text-sm">{entry.athleteName}</p>
              {entry.results.length > 0 && (
                <div className="mt-1 space-y-1">
                  {entry.results.map((r) => (
                    <p key={r.id} className="text-xs text-status-neutral">
                      {r.observableName}: <span className="font-medium text-navy">{formatMark(r.value, r.unitSymbol)}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
