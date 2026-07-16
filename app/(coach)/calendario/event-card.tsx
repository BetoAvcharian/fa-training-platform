'use client'

import { useState, useTransition } from 'react'
import { addSessionLineAction, duplicateEventAction, createExceptionAction } from './actions'
import { Modal } from '@/components/ui/modal'
import type { Event, SessionExercise } from '@/domains/events/types'

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}

export function EventCard({ event, lines, roster }: { event: Event; lines: SessionExercise[]; roster: RosterOption[] }) {
  const [open, setOpen] = useState(false)
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
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full text-left bg-white border border-gray-200 rounded-lg p-2.5 text-xs hover:border-gold/40 transition-colors"
      >
        <p className="font-medium text-navy truncate">{event.title}</p>
        <p className="text-[10px] text-status-neutral">{lines.length} línea(s)</p>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={event.title}>
        <div className="space-y-3">
          {lines.length === 0 && <p className="text-sm text-status-neutral">Sin líneas cargadas todavía.</p>}
          {lines.map((line) => (
            <div key={line.id} className="border-b border-gray-50 pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                    line.isStructured ? 'bg-status-positive/10 text-status-positive' : 'bg-status-attention/10 text-status-attention'
                  }`}
                >
                  {line.isStructured ? '✓' : '?'}
                </span>
                <span className="text-sm text-navy flex-1">{line.rawText}</span>
                <button
                  onClick={() => setExceptionFor(exceptionFor === line.id ? null : line.id)}
                  className="text-xs text-gold underline shrink-0"
                >
                  Excepción
                </button>
              </div>

              {exceptionFor === line.id && (
                <form action={(fd) => handleException(line.id, fd)} className="mt-2 ml-6 flex flex-col gap-2">
                  <select name="athleteMembershipId" className="input-field text-sm" required>
                    <option value="">Para quién</option>
                    {roster.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input name="rawText" placeholder="Variante para esta persona" className="flex-1 input-field text-sm" required />
                    <button type="submit" disabled={pending} className="btn-primary px-3 text-sm">
                      Ok
                    </button>
                  </div>
                  {exceptionError && <p className="text-xs text-status-critical">{exceptionError}</p>}
                </form>
              )}
            </div>
          ))}

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-status-neutral mb-1">Agregar ejercicio</p>
            <div className="flex gap-2">
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value as 'Atletismo' | 'Fuerza')}
                className="input-field w-24"
              >
                <option value="Atletismo">Atl.</option>
                <option value="Fuerza">Fza.</option>
              </select>
              <form action={handleAdd} className="flex-1 flex gap-2">
                <input
                  name="rawText"
                  placeholder={sport === 'Atletismo' ? "4x400m 1:15 r2'" : 'Sentadilla 4x8x120kg'}
                  className="flex-1 min-w-0 input-field"
                />
                <button type="submit" disabled={pending} className="btn-primary px-4 text-sm">
                  + Agregar
                </button>
              </form>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            {duplicating ? (
              <form action={handleDuplicate} className="flex gap-2">
                <input name="newDate" type="date" className="flex-1 input-field" required />
                <button type="submit" disabled={pending} className="btn-secondary px-4 text-sm">
                  Duplicar
                </button>
                <button type="button" onClick={() => setDuplicating(false)} className="text-xs text-status-neutral">
                  Cancelar
                </button>
              </form>
            ) : (
              <button onClick={() => setDuplicating(true)} className="text-xs text-status-neutral underline">
                Duplicar a otra fecha
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
