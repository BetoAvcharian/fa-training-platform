'use client'

import { useState, useTransition } from 'react'
import { enrollAthleteAction, unenrollAthleteAction, recordResultAction } from '../actions'
import { MarkValueInput } from '@/components/ui/mark-value-input'

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}

interface ObservableOption {
  id: string
  name: string
  unitSymbol: string | null
}

export function EnrollForm({ eventId, roster }: { eventId: string; roster: RosterOption[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div>
      <select
        disabled={pending}
        defaultValue=""
        onChange={(e) => {
          if (!e.target.value) return
          const formData = new FormData()
          formData.set('athleteMembershipId', e.target.value)
          startTransition(async () => {
            const result = await enrollAthleteAction(eventId, formData)
            setError(result?.error ?? null)
          })
          e.target.value = ''
        }}
        className="input-field"
      >
        <option value="">+ Inscribir atleta</option>
        {roster.map((r) => (
          <option key={r.id} value={r.id}>
            {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-status-critical mt-1">{error}</p>}
    </div>
  )
}

export function UnenrollButton({ eventId, athleteMembershipId }: { eventId: string; athleteMembershipId: string }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => unenrollAthleteAction(eventId, athleteMembershipId))}
      className="text-[10px] text-status-critical underline"
    >
      Quitar
    </button>
  )
}

export function ResultForm({
  eventId,
  athleteMembershipId,
  observables,
}: {
  eventId: string
  athleteMembershipId: string
  observables: ObservableOption[]
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedObs, setSelectedObs] = useState('')
  const selectedUnit = observables.find((o) => o.id === selectedObs)?.unitSymbol ?? null

  function handleSubmit(formData: FormData) {
    formData.set('athleteMembershipId', athleteMembershipId)
    startTransition(async () => {
      const result = await recordResultAction(eventId, formData)
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
        + Resultado
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="flex flex-wrap items-center gap-1.5 mt-1">
      <select
        name="observableId"
        value={selectedObs}
        onChange={(e) => setSelectedObs(e.target.value)}
        className="rounded-md border border-gray-200 px-2 py-1 text-xs"
        required
      >
        <option value="">Prueba</option>
        {observables.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} {o.unitSymbol ? `(${o.unitSymbol})` : ''}
          </option>
        ))}
      </select>
      <MarkValueInput name="value" unitSymbol={selectedUnit} />
      <input name="windMs" type="number" step="0.1" placeholder="Viento m/s" className="w-24 rounded-md border border-gray-200 px-2 py-1 text-xs" />
      <button type="submit" disabled={pending} className="bg-navy text-white rounded-md px-2 py-1 text-xs disabled:opacity-50">
        Guardar
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-status-neutral">
        x
      </button>
      {error && <p className="text-[10px] text-status-critical w-full">{error}</p>}
    </form>
  )
}
