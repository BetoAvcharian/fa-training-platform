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
      <button onClick={() => setOpen(true)} className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-2 text-sm font-medium text-navy">
        + Nueva competencia
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 max-w-sm">
      <input name="title" placeholder="Nombre (ej: Provincial U18)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
      <input name="date" type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
          Crear
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 rounded-lg border border-gray-200 text-sm text-status-neutral">
          Cancelar
        </button>
      </div>
    </form>
  )
}
