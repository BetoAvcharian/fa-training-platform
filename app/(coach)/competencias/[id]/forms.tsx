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
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  function enroll(athleteMembershipId: string) {
    const formData = new FormData()
    formData.set('athleteMembershipId', athleteMembershipId)
    startTransition(async () => {
      const result = await enrollAthleteAction(eventId, formData)
      setError(result?.error ?? null)
      if (!result?.error) {
        setOpen(false)
        setQuery('')
      }
    })
  }

  const filtered = roster.filter((r) => {
    const name = r.person ? `${r.person.firstName} ${r.person.lastName}` : ''
    return name.toLowerCase().includes(query.trim().toLowerCase())
  })

  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="input-field text-left text-status-neutral">
          + Inscribir atleta
        </button>
      ) : (
        <div className="border border-outline rounded-lg bg-panel overflow-hidden">
          <input
            autoFocus
            disabled={pending}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar atleta…"
            className="w-full px-3 py-2 text-sm bg-panel text-ink border-b border-outline outline-none"
          />
          <div className="max-h-40 overflow-y-auto">
            {filtered.map((r) => (
              <button
                type="button"
                key={r.id}
                disabled={pending}
                onClick={() => enroll(r.id)}
                className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-outline/40"
              >
                {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-status-neutral">Sin resultados.</p>}
          </div>
          <button type="button" onClick={() => setOpen(false)} className="w-full text-center text-xs text-status-neutral py-1.5 border-t border-outline">
            Cerrar
          </button>
        </div>
      )}
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
      <button onClick={() => setOpen(true)} className="text-xs text-ink underline">
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
        className="rounded-md border border-outline bg-panel text-ink px-2 py-1 text-xs"
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
      <input name="windMs" type="number" step="0.1" placeholder="Viento m/s" className="w-24 rounded-md border border-outline bg-panel text-ink px-2 py-1 text-xs" />
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
