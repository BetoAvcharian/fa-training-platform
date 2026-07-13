import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getCompetitions } from '@/domains/competitions/queries'
import { CompetitionForm } from './competition-form'

export const dynamic = 'force-dynamic'

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function CompetenciasPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const competitions = await getCompetitions(membership.organizationId)
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = competitions.filter((c) => (c.date ?? '') >= today)
  const past = competitions.filter((c) => (c.date ?? '') < today)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Competencias</p>
          <h1 className="font-display text-2xl font-bold text-navy">Competencias</h1>
        </div>
        <CompetitionForm />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-navy">Próximas</h2>
        {upcoming.length === 0 && <p className="text-sm text-status-neutral">Ninguna cargada.</p>}
        <div className="space-y-2">
          {upcoming.map((c) => (
            <Link key={c.id} href={`/competencias/${c.id}`} className="block rounded-xl border border-gray-200 bg-white p-4 hover:border-gold/40">
              <p className="font-medium text-navy">{c.title}</p>
              <p className="text-xs text-status-neutral">{formatDate(c.date)}</p>
            </Link>
          ))}
        </div>
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-navy">Pasadas</h2>
          <div className="space-y-2">
            {past.map((c) => (
              <Link key={c.id} href={`/competencias/${c.id}`} className="block rounded-xl border border-gray-200 bg-white p-4 opacity-70 hover:opacity-100">
                <p className="font-medium text-navy">{c.title}</p>
                <p className="text-xs text-status-neutral">{formatDate(c.date)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
