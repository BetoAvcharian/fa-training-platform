'use client'

import { useState, useTransition } from 'react'
import { createObjectiveAction } from './actions'

const CATEGORY_OPTIONS = [
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'salud', label: 'Salud' },
  { value: 'fisico', label: 'Físico' },
  { value: 'personal', label: 'Personal' },
]

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}

export function ObjectiveForm({ roster }: { roster: RosterOption[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createObjectiveAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setError(null)
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-outline bg-panel px-4 py-2 text-sm font-medium text-ink"
      >
        + Nuevo objetivo
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-outline bg-panel p-4 shadow-sm space-y-3 max-w-md">
      <select name="athleteMembershipId" className="input-field" required>
        <option value="">Elegí un atleta</option>
        {roster.map((r) => (
          <option key={r.id} value={r.id}>
            {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
          </option>
        ))}
      </select>
      <select name="category" className="input-field" required>
        {CATEGORY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <textarea
        name="description"
        placeholder="Objetivo (ej: Bajar de 55s en 400m para el Provincial)"
        className="input-field"
        rows={2}
        required
      />
      <input name="targetDate" type="date" className="input-field" />
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 btn-primary py-2 text-sm"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary px-4 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
