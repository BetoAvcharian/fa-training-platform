'use client'

import { useState, useTransition } from 'react'
import { copyWeekAction } from './actions'

export function CopyWeekForm({ weekStart }: { weekStart: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function handleSubmit(formData: FormData) {
    formData.set('sourceWeekStart', weekStart)
    startTransition(async () => {
      const result = await copyWeekAction(formData)
      if (result?.error) {
        setError(result.error)
        setOk(false)
      } else {
        setError(null)
        setOk(true)
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-3 py-1.5 rounded-md border border-outline text-xs text-ink">
        Copiar semana a…
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-2">
      <input name="targetWeekStart" type="date" required className="rounded-md border border-outline bg-panel text-ink px-2 py-1 text-xs" />
      <button type="submit" disabled={pending} className="bg-navy text-white rounded-md px-3 py-1.5 text-xs disabled:opacity-50">
        {pending ? 'Copiando…' : 'Copiar'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-status-neutral">
        Cancelar
      </button>
      {error && <p className="text-xs text-status-critical">{error}</p>}
      {ok && <p className="text-xs text-status-positive">Listo ✓</p>}
    </form>
  )
}
