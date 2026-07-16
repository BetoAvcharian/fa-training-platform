'use client'

import { useState, useTransition, useMemo } from 'react'
import { createEventAction } from './actions'
import { Modal } from '@/components/ui/modal'

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}
interface GroupOption {
  id: string
  name: string
}

export function NewTrainingForm({
  roster,
  groups,
  defaultDate,
}: {
  roster: RosterOption[]
  groups: GroupOption[]
  defaultDate: string
}) {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<Array<{ text: string; sport: 'Atletismo' | 'Fuerza' }>>([
    { text: '', sport: 'Atletismo' },
  ])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
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

  function updateLine(i: number, patch: Partial<{ text: string; sport: 'Atletismo' | 'Fuerza' }>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function handleSubmit(formData: FormData) {
    formData.set('athleteId', athleteId)
    for (const l of lines) {
      if (l.text.trim()) {
        formData.append('lineText', l.text)
        formData.append('lineSport', l.sport)
      }
    }
    startTransition(async () => {
      const result = await createEventAction(formData)
      if (result?.error) {
        setError(result.error)
        setOk(false)
      } else {
        setError(null)
        setOk(true)
        setOpen(false)
        setAthleteId('')
        setAthleteSearch('')
        setLines([{ text: '', sport: 'Atletismo' }])
        setTimeout(() => setOk(false), 3000)
      }
    })
  }

  return (
    <div className="mb-6">
      <button onClick={() => setOpen(true)} className="btn-primary px-4 py-2 text-sm">
        + Nuevo entrenamiento
      </button>
      {ok && <p className="text-xs text-status-positive mt-2">Entrenamiento creado ✓</p>}

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo entrenamiento">
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Título</label>
            <input name="title" placeholder="Ej: Series de pista" required className="input-field" />
          </div>

          <div>
            <label className="text-xs text-status-neutral mb-1 block">Fecha</label>
            <input name="date" type="date" required defaultValue={defaultDate} className="input-field" />
          </div>

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
                <div className="max-h-40 overflow-y-auto mt-1 border border-outline rounded-lg">
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
                  {filteredRoster.length === 0 && <p className="px-3 py-2 text-xs text-status-neutral">Sin resultados.</p>}
                </div>
              </>
            )}
          </div>

          {groups.length > 0 && (
            <div>
              <label className="text-xs text-status-neutral mb-1 block">— O elegí un grupo completo —</label>
              <select name="groupId" className="input-field">
                <option value="">Ninguno</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-3 border-t border-outline">
            <label className="text-xs text-status-neutral mb-1 block">Ejercicios (opcional — podés agregar más después también)</label>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    value={line.sport}
                    onChange={(e) => updateLine(i, { sport: e.target.value as 'Atletismo' | 'Fuerza' })}
                    className="input-field w-24"
                  >
                    <option value="Atletismo">Atl.</option>
                    <option value="Fuerza">Fza.</option>
                  </select>
                  <input
                    value={line.text}
                    onChange={(e) => updateLine(i, { text: e.target.value })}
                    placeholder={line.sport === 'Atletismo' ? "6x400m 1:10 r2'" : 'Sentadilla 4x8x100kg'}
                    className="flex-1 min-w-0 input-field"
                  />
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-status-critical text-lg leading-none px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, { text: '', sport: 'Atletismo' }])}
              className="text-xs text-ink underline mt-2"
            >
              + Agregar otro ejercicio
            </button>
          </div>

          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={pending} className="flex-1 btn-primary py-2.5 text-sm">
              {pending ? 'Creando…' : 'Crear entrenamiento'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-4 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
