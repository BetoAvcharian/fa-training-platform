'use client'

import { useState, useTransition } from 'react'
import { createCompetitionAction } from './actions'

export function CompetitionForm() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCompetitionAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm font-medium text-navy">
        + Nueva competencia
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="card p-4 space-y-2">
      <input name="title" placeholder="Nombre (ej: Provincial U18)" className="input-field" required />
      <input name="date" type="date" className="input-field" required />
      <input name="location" placeholder="Lugar" className="input-field" />
      <input name="locationMapUrl" placeholder="Link de Google Maps (opcional)" className="input-field" />
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 btn-primary py-2 text-sm">
          Crear
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-4 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  )
}
