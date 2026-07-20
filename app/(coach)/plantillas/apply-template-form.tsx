'use client'

import { useState, useTransition, useMemo } from 'react'
import { applyTemplateAction, deleteTemplateAction, updateTemplateAction } from './actions'
import { Modal } from '@/components/ui/modal'
import { getTodayISO } from '@/lib/today'

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}
interface GroupOption {
  id: string
  name: string
}

export function TemplateCard({
  template,
  roster,
  groups,
}: {
  template: { id: string; title: string; lines: string[] }
  roster: RosterOption[]
  groups: GroupOption[]
}) {
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editLines, setEditLines] = useState<Array<{ text: string; sport: 'Atletismo' | 'Fuerza' }>>(
    template.lines.length > 0 ? template.lines.map((l) => ({ text: l, sport: 'Atletismo' as const })) : [{ text: '', sport: 'Atletismo' }]
  )
  const [editError, setEditError] = useState<string | null>(null)
  const [propagatedMsg, setPropagatedMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [okMessage, setOkMessage] = useState<string | null>(null)
  const [mode, setMode] = useState<'single' | 'range'>('single')
  const [weekdays, setWeekdays] = useState<Set<number>>(new Set())
  const [athleteIds, setAthleteIds] = useState<Set<string>>(new Set())
  const [athleteSearch, setAthleteSearch] = useState('')
  const [groupId, setGroupId] = useState('')

  const WEEKDAY_LABELS = [
    { value: 1, label: 'L' },
    { value: 2, label: 'M' },
    { value: 3, label: 'X' },
    { value: 4, label: 'J' },
    { value: 5, label: 'V' },
    { value: 6, label: 'S' },
    { value: 0, label: 'D' },
  ]

  function toggleWeekday(day: number) {
    setWeekdays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

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

  function handleSubmit(formData: FormData) {
    formData.set('templateId', template.id)
    formData.set('mode', mode)
    for (const id of athleteIds) formData.append('athleteIds', id)
    formData.set('groupId', groupId)
    if (mode === 'range') {
      for (const d of weekdays) formData.append('weekdays', String(d))
    }
    startTransition(async () => {
      const result = await applyTemplateAction(formData)
      if (result?.error) {
        setError(result.error)
        setOkMessage(null)
      } else {
        setError(null)
        setOkMessage(result?.count ? `Creados ${result.count} entrenamientos ✓` : null)
        setOpen(false)
        setAthleteIds(new Set())
        setGroupId('')
        setWeekdays(new Set())
        setMode('single')
        setTimeout(() => setOkMessage(null), 4000)
      }
    })
  }

  function handleDelete() {
    if (!confirm(`¿Borrar la plantilla "${template.title}"?`)) return
    startTransition(async () => {
      await deleteTemplateAction(template.id)
    })
  }

  function updateEditLine(i: number, patch: Partial<{ text: string; sport: 'Atletismo' | 'Fuerza' }>) {
    setEditLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function handleEditSubmit(formData: FormData) {
    formData.set('templateId', template.id)
    for (const l of editLines) {
      if (l.text.trim()) {
        formData.append('lineText', l.text)
        formData.append('lineSport', l.sport)
      }
    }
    startTransition(async () => {
      const result = await updateTemplateAction(formData)
      if (result?.error) {
        setEditError(result.error)
      } else {
        setEditError(null)
        setEditOpen(false)
        setPropagatedMsg(
          result?.propagatedCount
            ? `Guardado — se actualizaron ${result.propagatedCount} entrenamiento${result.propagatedCount > 1 ? 's' : ''} futuro${result.propagatedCount > 1 ? 's' : ''} que ya estaban aplicados.`
            : 'Guardado.'
        )
        setTimeout(() => setPropagatedMsg(null), 6000)
      }
    })
  }

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-ink">{template.title}</p>
          {template.lines.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {template.lines.map((l, i) => (
                <li key={i} className="text-xs text-status-neutral truncate">
                  • {l}
                </li>
              ))}
            </ul>
          )}
        </div>
        <button onClick={() => setEditOpen(true)} className="text-status-neutral hover:text-gold text-xs shrink-0" aria-label="Editar">
          ✎
        </button>
        <button onClick={handleDelete} className="text-status-neutral hover:text-status-critical text-xs shrink-0" aria-label="Borrar">
          ✕
        </button>
      </div>
      <button onClick={() => setOpen(true)} className="btn-primary w-full py-2 text-sm mt-3">
        Usar esta plantilla
      </button>
      {okMessage && <p className="text-xs text-status-positive mt-1.5 text-center">{okMessage}</p>}
      {propagatedMsg && <p className="text-xs text-status-positive mt-1.5 text-center">{propagatedMsg}</p>}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={`Editar "${template.title}"`}>
        <form action={handleEditSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Título</label>
            <input name="title" defaultValue={template.title} required className="input-field" />
          </div>
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Ejercicios</label>
            <div className="space-y-2">
              {editLines.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <select value={line.sport} onChange={(e) => updateEditLine(i, { sport: e.target.value as 'Atletismo' | 'Fuerza' })} className="input-field w-24">
                    <option value="Atletismo">Atl.</option>
                    <option value="Fuerza">Fza.</option>
                  </select>
                  <input
                    value={line.text}
                    onChange={(e) => updateEditLine(i, { text: e.target.value })}
                    className="flex-1 min-w-0 input-field"
                  />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setEditLines((prev) => [...prev, { text: '', sport: 'Atletismo' }])} className="text-xs text-navy underline mt-2">
              + Agregar otro ejercicio
            </button>
          </div>
          <p className="text-[11px] text-status-neutral">
            Si esta plantilla ya se aplicó antes, los entrenamientos futuros que nadie completó todavía se actualizan solos —
            los que ya pasaron o que un atleta ya completó quedan como estaban.
          </p>
          {editError && <p className="text-xs text-status-critical">{editError}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending} className="flex-1 btn-primary py-2 text-sm">
              Guardar cambios
            </button>
            <button type="button" onClick={() => setEditOpen(false)} className="btn-secondary px-4 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title={`Aplicar "${template.title}"`}>
        <form action={handleSubmit} className="space-y-3">
          <div className="flex rounded-lg border border-outline overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex-1 py-1.5 ${mode === 'single' ? 'bg-navy text-white' : 'bg-panel text-ink'}`}
            >
              Un día
            </button>
            <button
              type="button"
              onClick={() => setMode('range')}
              className={`flex-1 py-1.5 ${mode === 'range' ? 'bg-navy text-white' : 'bg-panel text-ink'}`}
            >
              Varios días (rango)
            </button>
          </div>

          {mode === 'single' ? (
            <div>
              <label className="text-xs text-status-neutral mb-1 block">Fecha</label>
              <input name="date" type="date" required defaultValue={getTodayISO()} className="input-field" />
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-status-neutral mb-1 block">Qué días de la semana</label>
                <div className="flex gap-1.5">
                  {WEEKDAY_LABELS.map((d) => {
                    const checked = weekdays.has(d.value)
                    return (
                      <button
                        type="button"
                        key={d.value}
                        onClick={() => toggleWeekday(d.value)}
                        className={`w-8 h-8 rounded-lg text-xs font-medium border ${checked ? 'bg-gold border-gold text-navy' : 'border-outline text-ink'}`}
                      >
                        {d.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-status-neutral mb-1 block">Desde</label>
                  <input name="startDate" type="date" required defaultValue={getTodayISO()} className="input-field" />
                </div>
                <div>
                  <label className="text-xs text-status-neutral mb-1 block">Hasta</label>
                  <input name="endDate" type="date" required className="input-field" />
                </div>
              </div>
              <p className="text-[11px] text-status-neutral">Crea un entrenamiento por cada día que coincida en ese rango.</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-status-neutral block">Atletas</label>
              {athleteIds.size > 0 && <span className="text-xs text-gold font-medium">{athleteIds.size} elegido{athleteIds.size > 1 ? 's' : ''}</span>}
            </div>
            <input value={athleteSearch} onChange={(e) => setAthleteSearch(e.target.value)} placeholder="Buscar atleta…" className="input-field" />
            <div className="max-h-40 overflow-y-auto mt-1 border border-outline rounded-lg divide-y divide-outline">
              {filteredRoster.slice(0, 40).map((r) => {
                const checked = athleteIds.has(r.id)
                return (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => toggleAthlete(r.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${checked ? 'bg-gold/10 text-navy font-medium' : 'text-ink hover:bg-outline/40'}`}
                  >
                    <span className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center text-[10px] ${checked ? 'bg-gold border-gold text-navy' : 'border-status-neutral/50'}`}>
                      {checked ? '✓' : ''}
                    </span>
                    {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
                  </button>
                )
              })}
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

          {error && <p className="text-xs text-status-critical">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending || (athleteIds.size === 0 && !groupId)} className="flex-1 btn-primary py-2 text-sm">
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
