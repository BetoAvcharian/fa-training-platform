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
      <input name="name" placeholder="Nombre (ej: ISAK completo)" className="input-field" required />
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
