import Link from 'next/link'
import { getMyActiveMembership, getRoster, getAthletesForCoach } from '@/domains/athletes/queries'
import { RosterPicker } from '@/components/ui/roster-picker'

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
        <div className="flex gap-3">
          <Link href="/rendimiento/ranking" className="text-sm text-ink underline">
            Ranking por puntos WA →
          </Link>
          <Link href="/rendimiento/comparar" className="text-sm text-ink underline">
            Comparar atletas/grupo →
          </Link>
        </div>
      </div>

      {roster.length === 0 && (
        <div className="rounded-xl border border-outline bg-panel p-5 text-sm text-status-neutral">
          Todavía no hay atletas en tu equipo.
        </div>
      )}

      <RosterPicker roster={roster} basePath="/rendimiento" />
    </div>
  )
}
