'use client'

import { useTransition } from 'react'
import { deactivateMemberAction } from './actions'

export function DeactivateButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm('¿Desactivar a esta persona?')) {
          startTransition(() => deactivateMemberAction(id))
        }
      }}
      className="text-xs text-status-critical underline disabled:opacity-50"
    >
      Desactivar
    </button>
  )
}
