'use client'

import { useState, useTransition } from 'react'
import { createObservableAction } from './actions'

interface Option {
  id: string
  name: string
}

export function ObservableForm({ sports, units }: { sports: Option[]; units: Option[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createObservableAction(formData)
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
        className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-2 text-sm font-medium text-navy"
      >
        + Nuevo ejercicio/prueba
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3 max-w-sm">
      <input name="name" placeholder="Nombre (ej: Sentadilla búlgara)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
      <select name="sportId" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
        <option value="">Deporte</option>
        {sports.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select name="unitId" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
        <option value="">Unidad</option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm text-navy">
        <input type="checkbox" name="isPerformance" />
        Puede generar récord
      </label>
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
          Guardar
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 rounded-lg border border-gray-200 text-sm text-status-neutral">
          Cancelar
        </button>
      </div>
    </form>
  )
}
