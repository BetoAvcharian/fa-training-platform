'use client'

import { useState } from 'react'

export function CopyJoinCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(code)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="font-display text-2xl font-bold text-ink tracking-widest"
      title="Copiar"
    >
      {code} {copied && <span className="text-xs text-status-positive align-middle">copiado</span>}
    </button>
  )
}
