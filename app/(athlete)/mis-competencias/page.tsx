import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getCompetitions } from '@/domains/competitions/queries'
import { CompetitionForm } from './competition-form'
import { getTodayISO } from '@/lib/today'

export const dynamic = 'force-dynamic'

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function CompetenciasPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const competitions = await getCompetitions(membership.organizationId)
  const today = getTodayISO()
  const upcoming = competitions.filter((c) => (c.date ?? '') >= today)
  const past = competitions.filter((c) => (c.date ?? '') < today)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Competencias</p>
        <h1 className="font-display text-2xl font-bold text-ink">Competencias</h1>
      </div>

      <CompetitionForm />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink">Próximas</h2>
        {upcoming.length === 0 && <p className="text-sm text-status-neutral">Ninguna cargada.</p>}
        <div className="space-y-2">
          {upcoming.map((c) => (
            <Link key={c.id} href={`/mis-competencias/${c.id}`} className="block card p-4">
              <p className="font-medium text-ink">{c.title}</p>
              <p className="text-xs text-status-neutral">
                {formatDate(c.date)}
                {c.location ? ` · ${c.location}` : ''}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-ink">Pasadas</h2>
          <div className="space-y-2">
            {past.map((c) => (
              <Link key={c.id} href={`/mis-competencias/${c.id}`} className="block card p-4 opacity-70">
                <p className="font-medium text-ink">{c.title}</p>
                <p className="text-xs text-status-neutral">{formatDate(c.date)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
