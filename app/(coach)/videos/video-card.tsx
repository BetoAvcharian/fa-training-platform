'use client'

import { useTransition, useState } from 'react'
import { deleteVideoAction } from './actions'

function getEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`

  const vimeo = url.match(/vimeo\.com\/(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`

  return null
}

export function VideoCard({
  id,
  title,
  description,
  sourceType,
  url,
  canManage,
  taggedAthletes,
}: {
  id: string
  title: string
  description: string | null
  sourceType: 'upload' | 'link'
  url: string
  canManage: boolean
  taggedAthletes: Array<{ id: string; name: string }>
}) {
  const [pending, startTransition] = useTransition()
  const [hidden, setHidden] = useState(false)
  const embedUrl = sourceType === 'link' ? getEmbedUrl(url) : null

  if (hidden) return null

  return (
    <div className="rounded-xl border border-outline bg-panel overflow-hidden">
      <div className="h-36 bg-navy/5">
        {sourceType === 'upload' ? (
          <video src={url} controls className="w-full h-full object-cover" />
        ) : embedUrl ? (
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center h-full text-sm text-ink underline">
            Ver video →
          </a>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-ink text-sm">{title}</p>
          {canManage && (
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteVideoAction(id)
                  if (!result?.error) setHidden(true)
                })
              }
              className="text-[10px] text-status-critical underline shrink-0"
            >
              Borrar
            </button>
          )}
        </div>
        {description && <p className="text-xs text-status-neutral mt-1">{description}</p>}
        {taggedAthletes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {taggedAthletes.map((a) => (
              <span key={a.id} className="text-[10px] bg-gold/10 text-ink rounded-full px-2 py-0.5">
                {a.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
