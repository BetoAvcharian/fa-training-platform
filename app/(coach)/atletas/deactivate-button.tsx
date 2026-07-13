'use client'

import { useState, useTransition } from 'react'
import { deactivateMemberAction } from './actions'

export function DeactivateButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-status-neutral">¿Seguro?</span>
        <button
          disabled={pending}
          onClick={() => startTransition(() => deactivateMemberAction(id))}
          className="btn-danger"
        >
          Sí, desactivar
        </button>
        <button onClick={() => setConfirming(false)} className="text-status-neutral hover:text-navy">
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button onClick={() => setConfirming(true)} className="btn-danger">
      Desactivar
    </button>
  )
}
