import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getVideosForAthlete } from '@/domains/videos/tags'

export const dynamic = 'force-dynamic'

function getEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
  return null
}

export default async function MisVideosPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const videos = await getVideosForAthlete(membership.id)

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Videos</p>
        <h1 className="font-display text-2xl font-bold text-navy">Mis videos</h1>
      </div>

      {videos.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center text-sm text-status-neutral">
          Todavía no hay videos donde te etiquetaron.
        </div>
      )}

      <div className="space-y-4">
        {videos.map((v) => {
          const embedUrl = v.sourceType === 'link' ? getEmbedUrl(v.url) : null
          return (
            <div key={v.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              <div className="aspect-video bg-navy/5">
                {v.sourceType === 'upload' ? (
                  <video src={v.url} controls className="w-full h-full" />
                ) : embedUrl ? (
                  <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
                ) : (
                  <a href={v.url} target="_blank" rel="noreferrer" className="flex items-center justify-center h-full text-sm text-navy underline">
                    Ver video →
                  </a>
                )}
              </div>
              <div className="p-3">
                <p className="font-medium text-navy text-sm">{v.title}</p>
                {v.description && <p className="text-xs text-status-neutral mt-1">{v.description}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
