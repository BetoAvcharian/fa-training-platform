import Link from 'next/link'
import { getMyActiveMembership, getRoster, getAthletesForCoach } from '@/domains/athletes/queries'

export const dynamic = 'force-dynamic'

export default async function SaludRosterPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const roster =
    membership.role === 'manager'
      ? await getRoster(membership.organizationId)
      : await getAthletesForCoach(membership.id)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Salud</p>
        <h1 className="font-display text-2xl font-bold text-navy">Elegí un atleta</h1>
        <p className="text-xs text-status-neutral mt-1">
          Solo vas a ver algo acá si sos el entrenador directo del atleta.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {roster.map((entry) => (
          <Link
            key={entry.id}
            href={`/salud/${entry.id}`}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-gold/40 transition-colors"
          >
            <p className="font-medium text-navy">
              {entry.person ? `${entry.person.firstName} ${entry.person.lastName}` : '—'}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
