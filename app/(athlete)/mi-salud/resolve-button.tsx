'use client'

import { useTransition } from 'react'
import { resolveHealthEpisodeAction } from './actions'

export function ResolveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => resolveHealthEpisodeAction(id))}
      className="text-xs text-status-neutral underline disabled:opacity-50"
    >
      Marcar resuelto
    </button>
  )
}
