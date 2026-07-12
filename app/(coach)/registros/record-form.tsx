'use client'

import { useState, useTransition } from 'react'
import { recordObservationAction } from './actions'

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}

interface ObservableOption {
  id: string
  name: string
  unitSymbol: string | null
}

export function RecordForm({ roster, observables }: { roster: RosterOption[]; observables: ObservableOption[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await recordObservationAction(formData)
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
    <form action={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select name="athleteMembershipId" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
          <option value="">Atleta</option>
          {roster.map((r) => (
            <option key={r.id} value={r.id}>
              {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
            </option>
          ))}
        </select>
        <select name="observableId" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
          <option value="">Qué registrar</option>
          {observables.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} {o.unitSymbol ? `(${o.unitSymbol})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <input
          name="value"
          type="number"
          step="0.01"
          placeholder="Valor"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          required
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-navy text-white rounded-lg px-5 py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Registrar'}
        </button>
      </div>
      {error && <p className="text-xs text-status-critical">{error}</p>}
      {ok && <p className="text-xs text-status-positive">Guardado ✓</p>}
    </form>
  )
}
