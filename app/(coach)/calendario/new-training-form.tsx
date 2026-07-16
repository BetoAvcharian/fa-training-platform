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
  const [sport, setSport] = useState<'Atletismo' | 'Fuerza'>('Atletismo')
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

  function handleSubmit(formData: FormData) {
    formData.set('firstLineSport', sport)
    formData.set('athleteId', athleteId)
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
                <span className="text-sm text-navy font-medium">
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
                <div className="max-h-40 overflow-y-auto mt-1 border border-gray-100 rounded-lg">
                  {filteredRoster.slice(0, 30).map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setAthleteId(r.id)}
                      className="w-full text-left px-3 py-2 text-sm text-navy hover:bg-gold/5"
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

          <div className="pt-3 border-t border-gray-100">
            <label className="text-xs text-status-neutral mb-1 block">Primer ejercicio (opcional — podés agregar más después)</label>
            <div className="flex gap-2">
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value as 'Atletismo' | 'Fuerza')}
                className="input-field w-24"
              >
                <option value="Atletismo">Atl.</option>
                <option value="Fuerza">Fza.</option>
              </select>
              <input
                name="firstLine"
                placeholder={sport === 'Atletismo' ? "6x400m 1:10 r2'" : 'Sentadilla 4x8x100kg'}
                className="flex-1 min-w-0 input-field"
              />
            </div>
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
