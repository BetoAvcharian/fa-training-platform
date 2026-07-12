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
}: {
  id: string
  title: string
  description: string | null
  sourceType: 'upload' | 'link'
  url: string
  canManage: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [hidden, setHidden] = useState(false)
  const embedUrl = sourceType === 'link' ? getEmbedUrl(url) : null

  if (hidden) return null

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="aspect-video bg-navy/5">
        {sourceType === 'upload' ? (
          <video src={url} controls className="w-full h-full" />
        ) : embedUrl ? (
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen />
        ) : (
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center h-full text-sm text-navy underline">
            Ver video →
          </a>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-navy text-sm">{title}</p>
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
      </div>
    </div>
  )
}
