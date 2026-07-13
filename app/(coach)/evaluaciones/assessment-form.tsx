'use client'

import { useState, useTransition } from 'react'
import { createAssessmentAction } from './actions'

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}
interface ProtocolOption {
  id: string
  name: string
}
interface ObservableOption {
  id: string
  name: string
  unitSymbol: string | null
}

export function AssessmentForm({
  roster,
  protocols,
  observables,
}: {
  roster: RosterOption[]
  protocols: ProtocolOption[]
  observables: ObservableOption[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createAssessmentAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setOpen(false)
        setSelected(new Set())
      }
    })
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-2 text-sm font-medium text-navy">
        + Nueva evaluación
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 max-w-lg">
      <select name="athleteMembershipId" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
        <option value="">Atleta</option>
        {roster.map((r) => (
          <option key={r.id} value={r.id}>
            {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
          </option>
        ))}
      </select>
      <input name="title" placeholder="Título (ej: Evaluación antropométrica ISAK)" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
      <div className="flex gap-2">
        <input name="date" type="date" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm" />
        {protocols.length > 0 && (
          <select name="protocolId" className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Sin protocolo</option>
            {protocols.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div>
        <p className="text-xs text-status-neutral mb-1">Qué se midió</p>
        <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-2">
          {observables.map((o) => (
            <div key={o.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.has(o.id)}
                onChange={(e) => {
                  const next = new Set(selected)
                  if (e.target.checked) next.add(o.id)
                  else next.delete(o.id)
                  setSelected(next)
                }}
              />
              <span className="text-xs text-navy flex-1">
                {o.name} {o.unitSymbol ? `(${o.unitSymbol})` : ''}
              </span>
              {selected.has(o.id) && (
                <>
                  <input type="hidden" name="observableId" value={o.id} />
                  <input name="value" type="number" step="0.01" placeholder="Valor" className="w-20 rounded-md border border-gray-200 px-2 py-1 text-xs" />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <textarea name="notes" placeholder="Notas (opcional)" rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />

      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
          Guardar
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 rounded-lg border border-gray-200 text-sm text-status-neutral">
          Cancelar
        </button>
      </div>
    </form>
  )
}
