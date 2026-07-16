'use client'

import { useState, useTransition } from 'react'
import { submitSessionFeedbackAction } from './actions'

const STATUS_OPTIONS = [
  { value: 'completado', label: 'Completado', color: 'bg-status-positive' },
  { value: 'completado_con_observacion', label: 'Completado con observación', color: 'bg-status-attention' },
  { value: 'no_completado', label: 'No completado', color: 'bg-status-critical' },
] as const

export function SessionFeedbackForm({
  eventId,
  initialStatus,
  initialNotes,
}: {
  eventId: string
  initialStatus: string | null
  initialNotes: string | null
}) {
  const [status, setStatus] = useState<string | null>(initialStatus)
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const needsNotes = status === 'completado_con_observacion' || status === 'no_completado'

  function handleSubmit() {
    if (!status) {
      setError('Elegí un estado')
      return
    }
    const formData = new FormData()
    formData.set('eventId', eventId)
    formData.set('status', status)
    formData.set('notes', notes)
    startTransition(async () => {
      const result = await submitSessionFeedbackAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setError(null)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    })
  }

  return (
    <div className="mt-3 border-t border-gray-100 pt-3 space-y-2">
      <p className="text-xs text-status-neutral">¿Cómo te fue con esta sesión?</p>
      <div className="flex flex-col gap-1.5">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={`text-left text-xs rounded-lg px-3 py-2 border ${
              status === opt.value ? `${opt.color} text-white border-transparent` : 'border-outline text-ink'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {needsNotes && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contanos qué pasó (opcional)"
          rows={2}
          className="w-full rounded-lg border border-outline px-3 py-2 text-xs"
        />
      )}
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={pending}
        className="w-full btn-primary py-2 text-xs"
      >
        {pending ? 'Guardando…' : saved ? 'Guardado ✓' : 'Guardar feedback'}
      </button>
    </div>
  )
}
