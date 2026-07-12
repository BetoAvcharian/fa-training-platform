'use client'

import { useState, useTransition } from 'react'
import { createGroupAction } from './actions'

export function GroupForm() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createGroupAction(formData)
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
        + Nuevo grupo
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3 max-w-sm">
      <input
        name="name"
        placeholder="Nombre del grupo (ej: Sub-18 fondo)"
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
