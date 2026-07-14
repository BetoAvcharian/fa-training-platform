'use client'

import { useTransition } from 'react'
import { markMyObjectiveAchievedAction } from './actions'

export function AchieveMyObjectiveButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => markMyObjectiveAchievedAction(id))}
      className="text-xs text-status-neutral underline shrink-0"
    >
      Logrado
    </button>
  )
}
