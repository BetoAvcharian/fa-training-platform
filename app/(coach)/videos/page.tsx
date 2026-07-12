import { getMyActiveMembership, getRoster } from '@/domains/athletes/queries'
import { getVideos } from '@/domains/videos/queries'
import { getAthletesForVideo } from '@/domains/videos/tags'
import { VideoForm } from './video-form'
import { VideoCard } from './video-card'

export const dynamic = 'force-dynamic'

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ atleta?: string; desde?: string; hasta?: string }>
}) {
  const params = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [videos, roster] = await Promise.all([
    getVideos(membership.organizationId),
    getRoster(membership.organizationId),
  ])
  const canManage = membership.role === 'manager' || membership.role === 'coach'

  let filtered = videos
  if (params.desde) filtered = filtered.filter((v) => v.createdAt.slice(0, 10) >= params.desde!)
  if (params.hasta) filtered = filtered.filter((v) => v.createdAt.slice(0, 10) <= params.hasta!)

  const videosWithTags = await Promise.all(
    filtered.map(async (v) => ({ video: v, tags: await getAthletesForVideo(v.id) }))
  )

  const visible = params.atleta
    ? videosWithTags.filter(({ tags }) => tags.some((t) => t.id === params.atleta))
    : videosWithTags

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Videos</p>
          <h1 className="font-display text-2xl font-bold text-navy">Biblioteca de videos</h1>
        </div>
        {canManage && <VideoForm organizationId={membership.organizationId} roster={roster} />}
      </div>

      <form className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-status-neutral block mb-1">Atleta</label>
          <select name="atleta" defaultValue={params.atleta ?? ''} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {roster.map((r) => (
              <option key={r.id} value={r.id}>
                {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-status-neutral block mb-1">Desde</label>
          <input type="date" name="desde" defaultValue={params.desde ?? ''} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-status-neutral block mb-1">Hasta</label>
          <input type="date" name="hasta" defaultValue={params.hasta ?? ''} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-navy text-white px-4 py-1.5 text-sm font-medium">
          Filtrar
        </button>
      </form>

      {visible.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-status-neutral">
          No hay videos que coincidan con el filtro.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(({ video: v, tags }) => (
          <VideoCard
            key={v.id}
            id={v.id}
            title={v.title}
            description={v.description}
            sourceType={v.sourceType}
            url={v.url}
            canManage={canManage}
            taggedAthletes={tags}
          />
        ))}
      </div>
    </div>
  )
}
