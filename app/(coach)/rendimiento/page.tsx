import Link from 'next/link'
import { getMyActiveMembership, getRoster, getAthletesForCoach } from '@/domains/athletes/queries'

export const dynamic = 'force-dynamic'

export default async function RendimientoRosterPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const roster =
    membership.role === 'manager'
      ? await getRoster(membership.organizationId)
      : await getAthletesForCoach(membership.id)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Rendimiento</p>
          <h1 className="font-display text-2xl font-bold text-ink">Elegí un atleta</h1>
        </div>
        <Link href="/rendimiento/comparar" className="text-sm text-ink underline">
          Comparar atletas/grupo →
        </Link>
      </div>

      {roster.length === 0 && (
        <div className="rounded-xl border border-outline bg-panel p-5 text-sm text-status-neutral">
          Todavía no hay atletas en tu equipo.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roster.map((entry) => (
          <Link
            key={entry.id}
            href={`/rendimiento/${entry.id}`}
            className="rounded-xl border border-outline bg-panel p-4 shadow-sm hover:border-gold/40 transition-colors"
          >
            <p className="font-medium text-ink">
              {entry.person ? `${entry.person.firstName} ${entry.person.lastName}` : '—'}
            </p>
            <p className="text-xs text-status-neutral">{entry.status === 'activo' ? 'Activo' : entry.status}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
