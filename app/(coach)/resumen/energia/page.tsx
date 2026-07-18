import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getLowestEnergyToday } from '@/domains/observations/checkin'
import { getTodayISO } from '@/lib/today'

export const dynamic = 'force-dynamic'

export default async function EnergiaHoyPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const today = getTodayISO()
  const list = await getLowestEnergyToday(membership.organizationId, today)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/resumen" className="text-xs text-status-neutral hover:text-ink">
          ← Volver a Resumen
        </Link>
        <p className="text-xs uppercase tracking-wider text-gold font-medium mt-2">Resumen</p>
        <h1 className="font-display text-2xl font-bold text-ink">Energía y fatiga — hoy</h1>
      </div>

      {list.length === 0 && (
        <div className="rounded-xl border border-outline bg-panel p-5 text-sm text-status-neutral">
          Nadie cargó su check-in de hoy todavía.
        </div>
      )}

      <div className="space-y-2">
        {list.map((a) => (
          <Link
            key={a.athleteMembershipId}
            href={`/atletas/${a.athleteMembershipId}`}
            className="card-hover p-4 flex items-center justify-between"
          >
            <p className="text-sm font-medium text-ink">{a.athleteName}</p>
            <div className="flex gap-3 text-sm text-status-neutral">
              <span>Energía {a.energia ?? '—'}/10</span>
              <span>Fatiga {a.fatiga ?? '—'}/10</span>
              <span>Molestia {a.molestia ?? '—'}/10</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
