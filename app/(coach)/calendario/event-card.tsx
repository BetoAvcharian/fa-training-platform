'use client'

import { useState, useTransition } from 'react'
import { addSessionLineAction, duplicateEventAction, createExceptionAction } from './actions'
import type { Event, SessionExercise } from '@/domains/events/types'

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}

export function EventCard({ event, lines, roster }: { event: Event; lines: SessionExercise[]; roster: RosterOption[] }) {
  const [expanded, setExpanded] = useState(false)
  const [sport, setSport] = useState<'Atletismo' | 'Fuerza'>('Atletismo')
  const [pending, startTransition] = useTransition()
  const [duplicating, setDuplicating] = useState(false)
  const [exceptionFor, setExceptionFor] = useState<string | null>(null)
  const [exceptionError, setExceptionError] = useState<string | null>(null)

  function handleAdd(formData: FormData) {
    startTransition(async () => {
      await addSessionLineAction(event.id, sport, formData)
    })
  }

  function handleDuplicate(formData: FormData) {
    formData.set('sourceEventId', event.id)
    startTransition(async () => {
      await duplicateEventAction(formData)
      setDuplicating(false)
    })
  }

  function handleException(lineId: string, formData: FormData) {
    startTransition(async () => {
      const result = await createExceptionAction(event.id, lineId, sport, formData)
      if (result?.error) setExceptionError(result.error)
      else {
        setExceptionError(null)
        setExceptionFor(null)
      }
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
            <div key={line.id}>
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-[9px] px-1 py-0.5 rounded-full ${
                    line.isStructured ? 'bg-status-positive/10 text-status-positive' : 'bg-status-attention/10 text-status-attention'
                  }`}
                >
                  {line.isStructured ? '✓' : '?'}
                </span>
                <span className="text-navy truncate flex-1">{line.rawText}</span>
                <button
                  onClick={() => setExceptionFor(exceptionFor === line.id ? null : line.id)}
                  className="text-[9px] text-gold underline shrink-0"
                >
                  Excepción
                </button>
              </div>

              {exceptionFor === line.id && (
                <form action={(fd) => handleException(line.id, fd)} className="mt-1 ml-4 flex flex-col gap-1">
                  <select name="athleteMembershipId" className="text-[10px] border border-gray-300 rounded px-1 py-0.5" required>
                    <option value="">Para quién</option>
                    {roster.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <input
                      name="rawText"
                      placeholder="Variante para esta persona"
                      className="flex-1 min-w-0 border border-gray-300 rounded px-1.5 py-1 text-[11px]"
                      required
                    />
                    <button type="submit" disabled={pending} className="bg-gold text-white rounded px-2 text-[11px] disabled:opacity-50">
                      Ok
                    </button>
                  </div>
                  {exceptionError && <p className="text-[9px] text-status-critical">{exceptionError}</p>}
                </form>
              )}
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

          {duplicating ? (
            <form action={handleDuplicate} className="flex gap-1 mt-1.5">
              <input name="newDate" type="date" className="flex-1 min-w-0 border border-gray-300 rounded px-1.5 py-1 text-[11px]" required />
              <button type="submit" disabled={pending} className="bg-gold text-white rounded px-2 text-[11px] disabled:opacity-50">
                Ir
              </button>
            </form>
          ) : (
            <button onClick={() => setDuplicating(true)} className="text-[10px] text-status-neutral underline mt-1.5">
              Duplicar a otra fecha
            </button>
          )}
        </div>
      )}
    </div>
  )
}
