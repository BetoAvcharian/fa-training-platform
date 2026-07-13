'use client'

import { useState, useTransition } from 'react'
import { createProtocolAction } from './actions'

interface ObservableOption {
  id: string
  name: string
}

export function ProtocolForm({ observables }: { observables: ObservableOption[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createProtocolAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-navy underline">
        + Nuevo protocolo
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 max-w-sm">
      <input name="name" placeholder="Nombre (ej: ISAK completo)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
      <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
        {observables.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-xs text-navy">
            <input type="checkbox" name="observableIds" value={o.id} />
            {o.name}
          </label>
        ))}
      </div>
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
