'use client'

import { useState, useTransition } from 'react'
import { recordMyResultAction } from './actions'

interface ObservableOption {
  id: string
  name: string
  unitSymbol: string | null
}

export function MyRecordForm({ observables }: { observables: ObservableOption[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await recordMyResultAction(formData)
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
    <form action={handleSubmit} className="card p-4 space-y-3">
      <select name="observableId" className="input-field" required>
        <option value="">Qué registrar</option>
        {observables.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} {o.unitSymbol ? `(${o.unitSymbol})` : ''}
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <input name="value" type="number" step="0.01" placeholder="Valor" className="input-field flex-1" required />
        <input name="date" type="date" className="input-field flex-1" />
      </div>
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <button type="submit" disabled={pending} className="w-full btn-primary py-2 text-sm">
        {pending ? 'Guardando…' : ok ? 'Guardado ✓' : 'Registrar'}
      </button>
    </form>
  )
}
