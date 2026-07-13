import Link from 'next/link'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getVideos } from '@/domains/videos/queries'

export const dynamic = 'force-dynamic'

const CATEGORIES: Array<{ key: string; label: string; description: string }> = [
  { key: 'carreras', label: 'Carreras', description: 'Series, largos, competencias en pista' },
  { key: 'tecnica', label: 'Técnica', description: 'Análisis técnico de gesto deportivo' },
  { key: 'musculacion', label: 'Musculación', description: 'Ejercicios de gimnasio' },
  { key: 'entrenamientos', label: 'Entrenamientos', description: 'Sesiones generales' },
]

export default async function VideosMenuPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const videos = await getVideos(membership.organizationId)
  const countByCategory = new Map<string, number>()
  for (const v of videos) {
    countByCategory.set(v.category, (countByCategory.get(v.category) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Videos</p>
        <h1 className="font-display text-2xl font-bold text-navy">Elegí una categoría</h1>
      </div>

      <Link
        href="/videos/todos"
        className="block rounded-xl border border-gold/40 bg-gold/5 p-4 hover:border-gold transition-colors"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-base font-bold text-navy">Ver todos los videos</p>
          <span className="text-xs text-status-neutral">{videos.length} en total</span>
        </div>
      </Link>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORIES.map((c) => (
          <Link
            key={c.key}
            href={`/videos/${c.key}`}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:border-gold/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold text-navy">{c.label}</p>
              <span className="text-xs text-status-neutral">{countByCategory.get(c.key) ?? 0} videos</span>
            </div>
            <p className="text-sm text-status-neutral mt-1">{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
