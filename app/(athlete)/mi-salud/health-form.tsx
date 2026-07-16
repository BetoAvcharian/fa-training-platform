'use client'

import { useState, useTransition } from 'react'
import { createHealthEpisodeAction } from './actions'

const ALL_TYPE_OPTIONS = [
  { value: 'lesion', label: 'Lesión' },
  { value: 'medicacion', label: 'Medicación' },
]

export function HealthForm({ gender: _gender }: { gender: string | null }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const TYPE_OPTIONS = ALL_TYPE_OPTIONS

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createHealthEpisodeAction(formData)
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
        className="w-full rounded-2xl border border-dashed border-gray-200 bg-white p-4 text-sm font-medium text-navy"
      >
        + Cargar episodio de salud
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
      <select name="type" className="input-field" required>
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        name="title"
        placeholder="Título (ej: Molestia isquiotibial derecho)"
        className="input-field"
        required
      />
      <textarea
        name="notes"
        placeholder="Notas (opcional)"
        className="input-field"
        rows={2}
      />
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
