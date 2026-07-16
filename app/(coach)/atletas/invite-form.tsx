'use client'

import { useState, useTransition } from 'react'
import { inviteMemberAction } from './actions'

interface CoachOption {
  id: string
  name: string | null
}

export function InviteForm({ coaches }: { coaches: CoachOption[] }) {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState('athlete')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await inviteMemberAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setError(null)
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-outline bg-panel px-4 py-2 text-sm font-medium text-ink"
      >
        + Invitar
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-gray-100 bg-panel p-4 shadow-sm space-y-3 max-w-sm">
      <input
        name="email"
        type="email"
        placeholder="Email de la persona"
        className="input-field"
        required
      />
      <select
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="input-field"
      >
        <option value="athlete">Atleta</option>
        <option value="coach">Entrenador</option>
      </select>
      {role === 'athlete' && (
        <select name="coachMembershipId" className="input-field" required>
          <option value="">Elegí su entrenador</option>
          {coaches.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name ?? '—'}
            </option>
          ))}
        </select>
      )}
      {error && <p className="text-xs text-status-critical">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 btn-primary py-2 text-sm"
        >
          Invitar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-secondary px-4 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
