'use client'

import { useState, useTransition } from 'react'
import { addSessionLineAction } from './actions'
import type { Event, SessionExercise } from '@/domains/events/types'

export function EventCard({ event, lines }: { event: Event; lines: SessionExercise[] }) {
  const [expanded, setExpanded] = useState(false)
  const [sport, setSport] = useState<'Atletismo' | 'Fuerza'>('Atletismo')
  const [pending, startTransition] = useTransition()

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await addSessionLineAction(event.id, sport, formData)
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 text-xs">
      <button onClick={() => setExpanded(!expanded)} className="text-left w-full">
        <p className="font-medium text-navy truncate">{event.title}</p>
        <p className="text-[10px] text-status-neutral">{lines.length} línea(s)</p>
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 border-t border-gray-100 pt-2">
          {lines.map((line) => (
            <div key={line.id} className="flex items-center gap-1.5">
              <span
                className={`text-[9px] px-1 py-0.5 rounded-full ${
                  line.isStructured ? 'bg-status-positive/10 text-status-positive' : 'bg-status-attention/10 text-status-attention'
                }`}
              >
                {line.isStructured ? '✓' : '?'}
              </span>
              <span className="text-navy truncate">{line.rawText}</span>
            </div>
          ))}

          <div className="flex gap-1 mt-2">
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value as 'Atletismo' | 'Fuerza')}
              className="text-[10px] border border-gray-300 rounded px-1"
            >
              <option value="Atletismo">Atl.</option>
              <option value="Fuerza">Fza.</option>
            </select>
            <form action={handleAdd} className="flex-1 flex gap-1">
              <input
                name="rawText"
                placeholder={sport === 'Atletismo' ? "4x400m 1:15 r2'" : 'Sentadilla 4x8x120kg'}
                className="flex-1 min-w-0 border border-gray-300 rounded px-1.5 py-1 text-[11px]"
              />
              <button type="submit" disabled={pending} className="bg-navy text-white rounded px-2 text-[11px] disabled:opacity-50">
                +
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
