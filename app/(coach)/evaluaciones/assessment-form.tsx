'use client'

import { useState, useTransition, useMemo } from 'react'
import { createAssessmentAction } from './actions'
import { Modal } from '@/components/ui/modal'
import { MarkValueInput } from '@/components/ui/mark-value-input'

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
  const [athleteId, setAthleteId] = useState('')
  const [athleteSearch, setAthleteSearch] = useState('')

  const filteredRoster = useMemo(() => {
    const q = athleteSearch.trim().toLowerCase()
    if (!q) return roster
    return roster.filter((r) => {
      const name = r.person ? `${r.person.firstName} ${r.person.lastName}`.toLowerCase() : ''
      return name.includes(q)
    })
  }, [roster, athleteSearch])
  const selectedAthlete = roster.find((r) => r.id === athleteId)

  function handleSubmit(formData: FormData) {
    formData.set('athleteMembershipId', athleteId)
    startTransition(async () => {
      const result = await createAssessmentAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setOpen(false)
        setSelected(new Set())
        setAthleteId('')
      }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary px-4 py-2 text-sm">
        + Nueva evaluación
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva evaluación">
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Atleta</label>
            {selectedAthlete ? (
              <div className="flex items-center justify-between bg-gold/10 rounded-lg px-3 py-2">
                <span className="text-sm text-ink font-medium">
                  {selectedAthlete.person?.firstName} {selectedAthlete.person?.lastName}
                </span>
                <button type="button" onClick={() => setAthleteId('')} className="text-xs text-status-neutral">
                  Cambiar
                </button>
              </div>
            ) : (
              <>
                <input
                  value={athleteSearch}
                  onChange={(e) => setAthleteSearch(e.target.value)}
                  placeholder="Buscar atleta…"
                  className="input-field"
                />
                <div className="max-h-32 overflow-y-auto mt-1 border border-gray-100 rounded-lg">
                  {filteredRoster.slice(0, 30).map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setAthleteId(r.id)}
                      className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-gold/5"
                    >
                      {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div>
            <label className="text-xs text-status-neutral mb-1 block">Título</label>
            <input name="title" placeholder="Ej: Evaluación antropométrica ISAK" className="input-field" required />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-status-neutral mb-1 block">Fecha</label>
              <input name="date" type="date" className="input-field" />
            </div>
            {protocols.length > 0 && (
              <div className="flex-1">
                <label className="text-xs text-status-neutral mb-1 block">Protocolo</label>
                <select name="protocolId" className="input-field">
                  <option value="">Sin protocolo</option>
                  {protocols.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-status-neutral mb-1 block">Qué se midió</label>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-gray-100 rounded-lg p-3">
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
                  <span className="text-sm text-ink flex-1">
                    {o.name} {o.unitSymbol ? `(${o.unitSymbol})` : ''}
                  </span>
                  {selected.has(o.id) && (
                    <>
                      <input type="hidden" name="observableId" value={o.id} />
                      <MarkValueInput name="value" unitSymbol={o.unitSymbol} />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-status-neutral mb-1 block">Notas (opcional)</label>
            <textarea name="notes" rows={2} className="input-field" />
          </div>

          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={pending} className="flex-1 btn-primary py-2.5 text-sm">
              {pending ? 'Guardando…' : 'Guardar evaluación'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-4 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
