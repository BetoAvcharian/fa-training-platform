'use client'

import { useState, useTransition } from 'react'
import { createMyObservableAction } from './actions'

interface Option {
  id: string
  name: string
}

export function MyObservableForm({ sports, units }: { sports: Option[]; units: Option[] }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createMyObservableAction(formData)
      if (result?.error) {
        setError(result.error)
        setOk(false)
      } else {
        setError(null)
        setOk(true)
        setTimeout(() => setOk(false), 2000)
      }
    })
  }

  return (
    <form action={handleSubmit} className="card p-4 space-y-2">
      <input name="name" placeholder="Nombre (ej: Salto en largo)" className="input-field" required />
      <div className="flex gap-2">
        <select name="sportId" className="input-field flex-1" required>
          <option value="">Deporte</option>
          {sports.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="unitId" className="input-field flex-1" required>
          <option value="">Unidad</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <button type="submit" disabled={pending} className="w-full btn-secondary py-2 text-sm">
        {pending ? 'Creando…' : ok ? 'Creada ✓' : 'Crear prueba'}
      </button>
    </form>
  )
}
