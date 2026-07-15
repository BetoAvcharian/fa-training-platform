'use client'

import { useState, useTransition } from 'react'
import { createEventAction } from './actions'

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

  function handleSubmit(formData: FormData) {
    formData.set('firstLineSport', sport)
    startTransition(async () => {
      const result = await createEventAction(formData)
      if (result?.error) {
        setError(result.error)
        setOk(false)
      } else {
        setError(null)
        setOk(true)
        setOpen(false)
        setTimeout(() => setOk(false), 3000)
      }
    })
  }

  return (
    <div className="mb-6 max-w-md">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-sm font-medium text-navy">
          + Nuevo entrenamiento
        </button>
      ) : (
        <form action={handleSubmit} className="mt-3 space-y-2 bg-white border border-gray-200 rounded-xl p-4">
          <input name="title" placeholder="Título (ej: Series de pista)" required className="input-field" />
          <input name="date" type="date" required defaultValue={defaultDate} className="input-field" />
          <select name="athleteId" className="input-field">
            <option value="">Elegí un atleta</option>
            {roster.map((a) => (
              <option key={a.id} value={a.id}>
                {a.person?.firstName} {a.person?.lastName}
              </option>
            ))}
          </select>
          {groups.length > 0 && (
            <select name="groupId" className="input-field">
              <option value="">— O elegí un grupo completo —</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-status-neutral mb-1">Primer ejercicio (opcional — podés agregar más después)</p>
            <div className="flex gap-1">
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value as 'Atletismo' | 'Fuerza')}
                className="text-xs border border-gray-300 rounded-md px-1"
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
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="flex-1 btn-primary py-2 text-sm">
              {pending ? 'Creando…' : 'Crear'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-4 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}
      {ok && <p className="text-xs text-status-positive mt-2">Entrenamiento creado ✓</p>}
    </div>
  )
}
