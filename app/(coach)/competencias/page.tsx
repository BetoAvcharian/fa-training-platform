import { getTodayISO } from '@/lib/today'
import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getCompetitionsWithCounts, type CompetitionWithCount } from '@/domains/competitions/queries'
import { CompetitionForm } from './competition-form'

export const dynamic = 'force-dynamic'

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(date: string) {
  const today = new Date(getTodayISO() + 'T00:00:00')
  const target = new Date(date + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}

export default async function CompetenciasPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const competitions = await getCompetitionsWithCounts(membership.organizationId)
  const today = getTodayISO()
  const upcoming = competitions.filter((c) => (c.date ?? '') >= today).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
  const target = upcoming[0]
  const restTimeline = [...competitions].filter((c) => c.id !== target?.id).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Competencias</p>
          <h1 className="font-display text-2xl font-bold text-ink">Calendario de competencia</h1>
        </div>
        <CompetitionForm />
      </div>

      {competitions.length === 0 && (
        <div className="rounded-xl border border-outline bg-panel p-6 text-sm text-status-neutral text-center">
          Todavía no hay competencias cargadas.
        </div>
      )}

      {/* Competencia objetivo — la próxima, destacada */}
      {target && (
        <Link
          href={`/competencias/${target.id}`}
          className="block rounded-2xl border-2 border-gold bg-gradient-to-br from-gold/10 to-transparent p-5 hover:shadow-lg transition-shadow"
        >
          <p className="text-[11px] uppercase tracking-widest text-gold font-bold mb-1">🎯 Próxima competencia</p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="font-display text-2xl font-bold text-ink leading-tight">{target.title}</p>
              <p className="text-sm text-status-neutral mt-1">
                {formatDate(target.date)}
                {target.location ? ` · ${target.location}` : ''}
              </p>
              <p className="text-xs text-status-neutral mt-1">{target.participantCount} atleta{target.participantCount !== 1 ? 's' : ''} anotados</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-3xl font-bold text-gold leading-none">
                {target.date ? Math.max(daysUntil(target.date), 0) : '—'}
              </p>
              <p className="text-[11px] text-status-neutral uppercase tracking-wide">días</p>
            </div>
          </div>
        </Link>
      )}

      {/* Timeline del resto — pasadas y futuras, cronológico descendente */}
      {restTimeline.length > 0 && (
        <div className="relative pl-6">
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-outline" />
          <div className="space-y-4">
            {restTimeline.map((c) => {
              const isPast = (c.date ?? '') < today
              return (
                <div key={c.id} className="relative">
                  <span
                    className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-panel ${
                      isPast ? 'bg-status-neutral' : 'bg-navy'
                    }`}
                  />
                  <Link
                    href={`/competencias/${c.id}`}
                    className={`block rounded-xl border border-outline bg-panel p-4 hover:border-navy/40 transition-colors ${isPast ? 'opacity-70 hover:opacity-100' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink truncate">{c.title}</p>
                        <p className="text-xs text-status-neutral">
                          {formatDate(c.date)}
                          {c.location ? ` · ${c.location}` : ''}
                        </p>
                      </div>
                      <span className="text-[11px] text-status-neutral shrink-0">
                        {c.participantCount} atleta{c.participantCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
