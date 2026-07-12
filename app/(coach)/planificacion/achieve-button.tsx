'use client'

import { useTransition } from 'react'
import { markObjectiveAchievedAction } from './actions'

export function AchieveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => markObjectiveAchievedAction(id))}
      className="text-xs text-status-neutral underline disabled:opacity-50"
    >
      Marcar logrado
    </button>
  )
}
