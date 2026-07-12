'use client'

import { useTransition } from 'react'
import { hideObservableAction } from './actions'

export function HideButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => hideObservableAction(id))}
      className="text-[10px] text-status-neutral underline shrink-0"
    >
      Ocultar
    </button>
  )
}
