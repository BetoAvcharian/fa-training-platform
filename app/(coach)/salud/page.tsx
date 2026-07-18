import { getMyActiveMembership, getRoster, getAthletesForCoach } from '@/domains/athletes/queries'
import { RosterPicker } from '@/components/ui/roster-picker'

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
        <h1 className="font-display text-2xl font-bold text-ink">Elegí un atleta</h1>
        <p className="text-xs text-status-neutral mt-1">
          Solo vas a ver algo acá si sos el entrenador directo del atleta.
        </p>
      </div>

      <RosterPicker roster={roster} basePath="/salud" />
    </div>
  )
}
