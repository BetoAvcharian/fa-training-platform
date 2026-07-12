import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getVideos } from '@/domains/videos/queries'
import { VideoForm } from './video-form'
import { VideoCard } from './video-card'

export const dynamic = 'force-dynamic'

export default async function VideosPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const videos = await getVideos(membership.organizationId)
  const canManage = membership.role === 'manager' || membership.role === 'coach'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Videos</p>
          <h1 className="font-display text-2xl font-bold text-navy">Biblioteca de videos</h1>
        </div>
        {canManage && <VideoForm organizationId={membership.organizationId} />}
      </div>

      {videos.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-status-neutral">
          Todavía no hay videos cargados.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((v) => (
          <VideoCard
            key={v.id}
            id={v.id}
            title={v.title}
            description={v.description}
            sourceType={v.sourceType}
            url={v.url}
            canManage={canManage}
          />
        ))}
      </div>
    </div>
  )
}
