'use client'

import { useState, useTransition, useMemo } from 'react'
import { applyTemplateAction, deleteTemplateAction } from './actions'
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
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
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

  function handleSubmit(formData: FormData) {
    formData.set('templateId', template.id)
    for (const id of athleteIds) formData.append('athleteIds', id)
    formData.set('groupId', groupId)
    startTransition(async () => {
      const result = await applyTemplateAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setOpen(false)
        setAthleteIds(new Set())
        setGroupId('')
      }
    })
  }

  function handleDelete() {
    if (!confirm(`¿Borrar la plantilla "${template.title}"?`)) return
    startTransition(async () => {
      await deleteTemplateAction(template.id)
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
        <button onClick={handleDelete} className="text-status-neutral hover:text-status-critical text-xs shrink-0" aria-label="Borrar">
          ✕
        </button>
      </div>
      <button onClick={() => setOpen(true)} className="btn-primary w-full py-2 text-sm mt-3">
        Usar esta plantilla
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`Aplicar "${template.title}"`}>
        <form action={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Fecha</label>
            <input name="date" type="date" required defaultValue={getTodayISO()} className="input-field" />
          </div>

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
