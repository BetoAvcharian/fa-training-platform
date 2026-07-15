'use client'

import { useState } from 'react'

interface ResolvedLine {
  line: { id: string; rawText: string }
  executed: unknown
}

export function SessionAccordion({
  title,
  lines,
}: {
  title: string
  lines: ResolvedLine[]
}) {
  const [open, setOpen] = useState(false)
  const doneCount = lines.filter((l) => l.executed).length

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm mb-2 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">🏃</span>
          <p className="font-medium text-navy text-sm truncate">{title}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {lines.length > 0 && (
            <span className="text-[10px] text-status-neutral">
              {doneCount}/{lines.length}
            </span>
          )}
          <span className={`text-status-neutral text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-1 border-t border-gray-50 pt-3">
          {lines.map((resolved) => (
            <p key={resolved.line.id} className="text-xs text-status-neutral">
              {resolved.line.rawText}
              {resolved.executed ? <span className="text-status-positive"> ✓</span> : null}
            </p>
          ))}
          {lines.length === 0 && <p className="text-xs text-gray-300">Sin líneas cargadas</p>}
        </div>
      )}
    </div>
  )
}
