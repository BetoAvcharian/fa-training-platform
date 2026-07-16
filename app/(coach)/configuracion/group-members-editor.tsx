'use client'

import { useTransition } from 'react'
import { addAthleteToGroupAction, removeAthleteFromGroupAction } from './actions'

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}

export function GroupMembersEditor({
  groupId,
  members,
  roster,
}: {
  groupId: string
  members: RosterOption[]
  roster: RosterOption[]
}) {
  const [pending, startTransition] = useTransition()
  const memberIds = new Set(members.map((m) => m.id))
  const available = roster.filter((r) => !memberIds.has(r.id))

  return (
    <div className="space-y-2">
      {members.map((m) => (
        <div key={m.id} className="flex items-center justify-between text-xs">
          <span className="text-ink">{m.person ? `${m.person.firstName} ${m.person.lastName}` : '—'}</span>
          <button
            disabled={pending}
            onClick={() => {
              const formData = new FormData()
              formData.set('groupId', groupId)
              formData.set('athleteMembershipId', m.id)
              startTransition(() => removeAthleteFromGroupAction(formData))
            }}
            className="text-status-critical underline disabled:opacity-50"
          >
            Quitar
          </button>
        </div>
      ))}

      {available.length > 0 && (
        <select
          disabled={pending}
          defaultValue=""
          onChange={(e) => {
            if (!e.target.value) return
            const formData = new FormData()
            formData.set('groupId', groupId)
            formData.set('athleteMembershipId', e.target.value)
            startTransition(() => addAthleteToGroupAction(formData))
            e.target.value = ''
          }}
          className="w-full text-xs rounded-lg border border-outline bg-panel text-ink px-2 py-1.5 mt-1"
        >
          <option value="">+ Agregar atleta al grupo</option>
          {available.map((a) => (
            <option key={a.id} value={a.id}>
              {a.person ? `${a.person.firstName} ${a.person.lastName}` : '—'}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
