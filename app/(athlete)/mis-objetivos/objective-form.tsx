'use client'

import { useState, useTransition } from 'react'
import { createMyObjectiveAction } from './actions'

const CATEGORY_OPTIONS = [
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'fisico', label: 'Físico' },
  { value: 'personal', label: 'Personal' },
]

export function MyObjectiveForm() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createMyObjectiveAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-2xl border border-dashed border-outline bg-panel p-4 text-sm font-medium text-ink">
        + Cargar objetivo
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="card p-4 space-y-3">
      <select name="category" className="input-field" required>
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <textarea name="description" placeholder="¿Qué te querés proponer?" rows={2} className="input-field" required />
      <input name="targetDate" type="date" className="input-field" />
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 btn-primary py-2 text-sm">
          Guardar
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-4 text-sm">
          Cancelar
        </button>
      </div>
    </form>
  )
}
