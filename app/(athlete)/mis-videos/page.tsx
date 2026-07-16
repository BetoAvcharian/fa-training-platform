import Link from 'next/link'
import { getMyActiveMembership, getRoster, getMyCoachMembershipId, getAthletesForCoach } from '@/domains/athletes/queries'
import { getVideosForAthlete } from '@/domains/videos/queries'
import { VideoForm } from '@/app/(coach)/videos/video-form'

export const dynamic = 'force-dynamic'

const CATEGORIES: Array<{ key: string; label: string; description: string }> = [
  { key: 'carreras', label: 'Carreras', description: 'Series, largos, competencias en pista' },
  { key: 'tecnica', label: 'Técnica', description: 'Análisis técnico de gesto deportivo' },
  { key: 'musculacion', label: 'Musculación', description: 'Ejercicios de gimnasio' },
  { key: 'entrenamientos', label: 'Entrenamientos', description: 'Sesiones generales' },
]

export default async function MisVideosMenuPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const coachMembershipId = await getMyCoachMembershipId()
  const [videos, roster] = await Promise.all([
    getVideosForAthlete(membership.id, coachMembershipId, membership.organizationId),
    coachMembershipId ? getAthletesForCoach(coachMembershipId) : getRoster(membership.organizationId),
  ])
  const countByCategory = new Map<string, number>()
  for (const v of videos) {
    countByCategory.set(v.category, (countByCategory.get(v.category) ?? 0) + 1)
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Videos</p>
        <h1 className="font-display text-2xl font-bold text-navy">Videos</h1>
      </div>

      <VideoForm organizationId={membership.organizationId} roster={roster} />

      <Link
        href="/mis-videos/todos"
        className="block rounded-2xl border border-gold/40 bg-gold/5 p-4 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-base font-bold text-navy">Ver todos los videos</p>
          <span className="text-xs text-status-neutral">{videos.length} en total</span>
        </div>
      </Link>

      <div className="space-y-2">
        {CATEGORIES.map((c) => (
          <Link key={c.key} href={`/mis-videos/${c.key}`} className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-navy">{c.label}</p>
              <span className="text-xs text-status-neutral">{countByCategory.get(c.key) ?? 0}</span>
            </div>
            <p className="text-xs text-status-neutral mt-0.5">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
