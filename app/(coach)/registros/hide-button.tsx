'use client'

import { useTransition, useState } from 'react'
import { hideObservableAction, unhideObservableAction } from './actions'

export function HideButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="text-right">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await hideObservableAction(id)
            setError(result?.error ?? null)
          })
        }
        className="text-[10px] text-status-neutral underline shrink-0"
      >
        Ocultar
      </button>
      {error && <p className="text-[10px] text-status-critical">{error}</p>}
    </div>
  )
}

export function UnhideButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await unhideObservableAction(id)
            setError(result?.error ?? null)
          })
        }
        className="text-xs text-ink underline"
      >
        Mostrar de nuevo
      </button>
      {error && <p className="text-[10px] text-status-critical">{error}</p>}
    </div>
  )
}
