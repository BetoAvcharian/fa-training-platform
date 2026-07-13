'use client'

import { useState, useTransition } from 'react'
import { updateProfileAction } from './actions'

const GENDER_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  otro: 'Otro',
  prefiero_no_decir: 'Prefiero no decir',
}

export function ProfileEditForm({
  birthDate,
  gender,
  phone,
  club,
}: {
  birthDate: string | null
  gender: string | null
  phone: string | null
  club: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateProfileAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setEditing(false)
      }
    })
  }

  if (!editing) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-status-neutral uppercase tracking-wide">Datos personales</p>
          <button onClick={() => setEditing(true)} className="text-xs text-navy underline">
            Editar
          </button>
        </div>
        <div>
          <p className="text-xs text-status-neutral">Fecha de nacimiento</p>
          <p className="text-sm text-navy">{birthDate ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-status-neutral">Género</p>
          <p className="text-sm text-navy">{gender ? GENDER_LABELS[gender] ?? gender : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-status-neutral">Teléfono</p>
          <p className="text-sm text-navy">{phone ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-status-neutral">Club</p>
          <p className="text-sm text-navy">{club ?? '—'}</p>
        </div>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
      <p className="text-xs text-status-neutral uppercase tracking-wide">Datos personales</p>
      <div>
        <label className="text-xs text-status-neutral">Fecha de nacimiento</label>
        <input name="birthDate" type="date" defaultValue={birthDate ?? ''} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1" />
      </div>
      <div>
        <label className="text-xs text-status-neutral">Género</label>
        <select name="gender" defaultValue={gender ?? ''} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1">
          <option value="">Sin especificar</option>
          {Object.entries(GENDER_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-status-neutral">Teléfono</label>
        <input name="phone" defaultValue={phone ?? ''} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1" />
      </div>
      <div>
        <label className="text-xs text-status-neutral">Club</label>
        <input name="club" defaultValue={club ?? ''} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm mt-1" />
      </div>
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
          Guardar
        </button>
        <button type="button" onClick={() => setEditing(false)} className="px-4 rounded-lg border border-gray-200 text-sm text-status-neutral">
          Cancelar
        </button>
      </div>
    </form>
  )
}
