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
  const [athleteIds, setAthleteIds] = useState<Set<string>>(new Set())
  const [athleteSearch, setAthleteSearch] = useState('')
  const [groupId, setGroupId] = useState('')

  const filteredRoster = useMemo(() => {
    const q = athleteSearch.trim().toLowerCase()
    if (!q) return roster
    return roster.filter((r) => {
      const name = r.person ? `${r.person.firstName} ${r.person.lastName}`.toLowerCase() : ''
      return name.includes(q)
    })
  }, [roster, athleteSearch])

  function toggleAthlete(id: string) {
    setAthleteIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function updateLine(i: number, patch: Partial<{ text: string; sport: 'Atletismo' | 'Fuerza' }>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function handleSubmit(formData: FormData) {
    for (const id of athleteIds) formData.append('athleteIds', id)
    formData.set('groupId', groupId)
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
        setAthleteIds(new Set())
        setAthleteSearch('')
        setGroupId('')
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
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-status-neutral block">Atletas</label>
              {athleteIds.size > 0 && (
                <span className="text-xs text-gold font-medium">{athleteIds.size} elegido{athleteIds.size > 1 ? 's' : ''}</span>
              )}
            </div>
            <input
              value={athleteSearch}
              onChange={(e) => setAthleteSearch(e.target.value)}
              placeholder="Buscar atleta… (podés elegir varios)"
              className="input-field"
            />
            <div className="max-h-44 overflow-y-auto mt-1 border border-outline rounded-lg divide-y divide-outline">
              {filteredRoster.slice(0, 40).map((r) => {
                const checked = athleteIds.has(r.id)
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => toggleAthlete(r.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${checked ? 'bg-gold/10 text-navy font-medium' : 'text-ink hover:bg-outline/40'}`}
                  >
                    <span
                      className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] ${checked ? 'bg-gold border-gold text-navy' : 'border-status-neutral/50'}`}
                    >
                      {checked ? '✓' : ''}
                    </span>
                    {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
                  </button>
                )
              })}
              {filteredRoster.length === 0 && <p className="px-3 py-2 text-xs text-status-neutral">Sin resultados.</p>}
            </div>
          </div>

          {groups.length > 0 && (
            <div>
              <label className="text-xs text-status-neutral mb-1 block">— O sumá un grupo completo —</label>
              <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input-field">
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
            <p className="text-[11px] text-status-neutral mb-2">
              Formato "4x400m 1:15 r2'" (reps x distancia, tiempo, descanso) para que quede como marca individual — cada atleta
              carga su propio tiempo y después lo podés comparar. Cualquier otro texto queda como nota simple.
            </p>
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
                    placeholder={line.sport === 'Atletismo' ? "4x400m 1:15 r2'" : 'Sentadilla 4x8x120kg'}
                    className="flex-1 min-w-0 input-field"
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, { text: '', sport: 'Atletismo' }])}
              className="text-xs text-navy underline mt-2"
            >
              + Agregar otro ejercicio
            </button>
          </div>

          {error && <p className="text-xs text-status-critical">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={pending || (athleteIds.size === 0 && !groupId)} className="flex-1 btn-primary py-2.5 text-sm">
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
