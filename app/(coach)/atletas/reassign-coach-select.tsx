'use client'

import { useTransition } from 'react'
import { reassignCoachAction } from './actions'

interface CoachOption {
  id: string
  name: string | null
}

export function ReassignCoachSelect({
  athleteMembershipId,
  currentCoachId,
  coaches,
}: {
  athleteMembershipId: string
  currentCoachId: string | null
  coaches: CoachOption[]
}) {
  const [pending, startTransition] = useTransition()

  return (
    <select
      defaultValue={currentCoachId ?? ''}
      disabled={pending}
      onChange={(e) => {
        const formData = new FormData()
        formData.set('athleteMembershipId', athleteMembershipId)
        formData.set('newCoachMembershipId', e.target.value)
        startTransition(() => reassignCoachAction(formData))
      }}
      className="text-xs rounded-lg border border-gray-200 px-2 py-1"
    >
      <option value="" disabled>
        Sin entrenador
      </option>
      {coaches.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name ?? '—'}
        </option>
      ))}
    </select>
  )
}
