'use client'

import { useState, useTransition } from 'react'
import { createHealthEpisodeAction } from './actions'

const TYPE_OPTIONS = [
  { value: 'lesion', label: 'Lesión' },
  { value: 'medicacion', label: 'Medicación' },
  { value: 'ciclo_menstrual', label: 'Ciclo menstrual' },
]

export function HealthForm() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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
      <select name="type" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
        {TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        name="title"
        placeholder="Título (ej: Molestia isquiotibial derecho)"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        required
      />
      <textarea
        name="notes"
        placeholder="Notas (opcional)"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        rows={2}
      />
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 rounded-lg border border-gray-200 text-sm text-status-neutral"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
