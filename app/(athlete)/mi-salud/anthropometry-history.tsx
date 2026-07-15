'use client'

import { useState } from 'react'
import { formatMark } from '@/lib/format-mark'

interface Entry {
  id: string
  observableId: string
  observableName: string
  unitSymbol: string | null
  value: number
  date: string
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function AnthropometryHistory({ history }: { history: Entry[] }) {
  const types = Array.from(new Map(history.map((h) => [h.observableId, h.observableName])).entries())
  const [selected, setSelected] = useState<Set<string>>(new Set(types.map(([id]) => id)))

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const visible = history.filter((h) => selected.has(h.observableId))

  if (history.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-status-neutral">
        Todavía no cargaste nada.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {types.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          {types.map(([id, name]) => (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`text-xs rounded-full px-3 py-1 border ${
                selected.has(id) ? 'bg-navy text-white border-navy' : 'bg-white text-status-neutral border-gray-200'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
        {visible.length === 0 && <p className="p-4 text-sm text-status-neutral">Nada para mostrar con este filtro.</p>}
        {visible.map((h) => (
          <div key={h.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-navy text-sm">{h.observableName}</p>
              <p className="text-xs text-status-neutral">{formatDate(h.date)}</p>
            </div>
            <p className="font-semibold text-navy">
              {formatMark(h.value, h.unitSymbol)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
