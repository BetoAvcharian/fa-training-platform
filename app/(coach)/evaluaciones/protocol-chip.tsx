'use client'

import { useTransition, useState } from 'react'
import { deleteProtocolAction } from './actions'

export function ProtocolChip({ id, name, deletable }: { id: string; name: string; deletable: boolean }) {
  const [pending, startTransition] = useTransition()
  const [confirming, setConfirming] = useState(false)

  return (
    <span className="text-xs bg-gray-50 rounded-full px-2 py-1 text-navy flex items-center gap-1.5">
      {name}
      {deletable &&
        (confirming ? (
          <>
            <button
              disabled={pending}
              onClick={() => startTransition(() => deleteProtocolAction(id))}
              className="text-status-critical font-medium"
            >
              Confirmar
            </button>
            <button onClick={() => setConfirming(false)} className="text-status-neutral">
              x
            </button>
          </>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-status-neutral hover:text-status-critical">
            ×
          </button>
        ))}
    </span>
  )
}
