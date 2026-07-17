'use client'

import { useState, useTransition } from 'react'
import { recordObservationAction } from './actions'
import { MarkValueInput } from '@/components/ui/mark-value-input'
import { AthleteSearchPicker } from '@/components/ui/athlete-search-picker'

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
  const [observableId, setObservableId] = useState('')

  const selectedUnit = observables.find((o) => o.id === observableId)?.unitSymbol ?? null

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
    <form action={handleSubmit} className="rounded-xl border border-outline bg-panel p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <AthleteSearchPicker name="athleteMembershipId" roster={roster} required />
        <select name="observableId" value={observableId} onChange={(e) => setObservableId(e.target.value)} className="input-field" required>
          <option value="">Qué registrar</option>
          {observables.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} {o.unitSymbol ? `(${o.unitSymbol})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 items-center">
        <MarkValueInput name="value" unitSymbol={selectedUnit} />
        <button
          type="submit"
          disabled={pending}
          className="btn-primary px-5 py-2 text-sm"
        >
          {pending ? 'Guardando…' : 'Registrar'}
        </button>
      </div>
      {error && <p className="text-xs text-status-critical">{error}</p>}
      {ok && <p className="text-xs text-status-positive">Guardado ✓</p>}
    </form>
  )
}
