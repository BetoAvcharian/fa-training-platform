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
        className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-2 text-sm font-medium text-navy"
      >
        + Invitar
      </button>
    )
  }

  return (
    <form action={handleSubmit} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3 max-w-sm">
      <input
        name="email"
        type="email"
        placeholder="Email de la persona"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        required
      />
      <select
        name="role"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      >
        <option value="athlete">Atleta</option>
        <option value="coach">Entrenador</option>
      </select>
      {role === 'athlete' && (
        <select name="coachMembershipId" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required>
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
          className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          Invitar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 rounded-lg border border-gray-200 text-sm text-status-neutral"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
