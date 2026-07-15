'use client'

import { useState, useTransition } from 'react'
import { selfEnrollAction, selfUnenrollAction, recordMyResultAction } from '../actions'

export function SelfEnrollButton({ eventId, enrolled }: { eventId: string; enrolled: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = enrolled ? await selfUnenrollAction(eventId) : await selfEnrollAction(eventId)
            if (result?.error) setError(result.error)
          })
        }
        className={enrolled ? 'btn-secondary px-4 py-2 text-sm' : 'btn-primary px-4 py-2 text-sm'}
      >
        {enrolled ? 'Desanotarme' : 'Anotarme'}
      </button>
      {error && <p className="text-xs text-status-critical mt-1">{error}</p>}
    </div>
  )
}

interface ObservableOption {
  id: string
  name: string
  unitSymbol: string | null
}

export function MyResultForm({ eventId, observables }: { eventId: string; observables: ObservableOption[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await recordMyResultAction(eventId, formData)
      if (result?.error) {
        setError(result.error)
        setOk(false)
      } else {
        setError(null)
        setOk(true)
        setTimeout(() => setOk(false), 2000)
      }
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
      <select name="observableId" className="input-field flex-1 min-w-[120px]" required>
        <option value="">Prueba</option>
        {observables.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} {o.unitSymbol ? `(${o.unitSymbol})` : ''}
          </option>
        ))}
      </select>
      <input name="value" type="number" step="0.01" placeholder="Valor" className="input-field w-24" required />
      <input name="windMs" type="number" step="0.1" placeholder="Viento" className="input-field w-24" />
      <button type="submit" disabled={pending} className="btn-primary px-4 py-2 text-sm">
        {pending ? 'Guardando…' : ok ? 'Guardado ✓' : 'Cargar mi resultado'}
      </button>
      {error && <p className="text-xs text-status-critical w-full">{error}</p>}
    </form>
  )
}
