'use client'

import { useState, useTransition } from 'react'
import { logAnthropometryAction } from './actions'

interface Observable {
  id: string
  name: string
  unitSymbol: string | null
}

export function AnthropometryForm({ observables }: { observables: Observable[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await logAnthropometryAction(formData)
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
        + Cargar peso, talla u otro dato
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
      <select name="observableId" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
        {observables.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} {o.unitSymbol ? `(${o.unitSymbol})` : ''}
          </option>
        ))}
      </select>
      <input
        name="value"
        type="number"
        step="0.1"
        placeholder="Valor"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        required
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
