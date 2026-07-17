'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { DeactivateButton } from './deactivate-button'
import { ReassignCoachSelect } from './reassign-coach-select'

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  coach: 'Entrenador',
  athlete: 'Atleta',
}

const ROLE_COLORS: Record<string, string> = {
  manager: 'bg-navy',
  coach: 'bg-gold',
  athlete: 'bg-status-positive',
}

function initials(name: string | null) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

interface Member {
  id: string
  role: string
  name: string | null
  email: string | null
  coachMembershipId: string | null
}

export function PersonasList({
  members,
  coaches,
  isManager,
}: {
  members: Member[]
  coaches: Array<{ id: string; name: string | null }>
  isManager: boolean
}) {
  const [query, setQuery] = useState('')

  const sorted = useMemo(
    () => [...members].sort((a, b) => (a.name ?? a.email ?? '').localeCompare(b.name ?? b.email ?? '', 'es')),
    [members]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((m) => (m.name ?? m.email ?? '').toLowerCase().includes(q))
  }, [sorted, query])

  return (
    <div className="space-y-3">
      {members.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre…"
          className="input-field"
        />
      )}

      {filtered.length === 0 && <p className="text-sm text-status-neutral">Sin resultados.</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((m) => {
          const displayName = m.name ?? m.email ?? '—'
          const card = (
            <div className="card-hover p-3.5 flex items-center gap-3">
              <div
                className={`shrink-0 w-10 h-10 rounded-full ${ROLE_COLORS[m.role] ?? 'bg-status-neutral'} text-white flex items-center justify-center text-xs font-bold`}
              >
                {initials(m.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{displayName}</p>
                <p className="text-xs text-status-neutral">{ROLE_LABELS[m.role] ?? m.role}</p>
              </div>
            </div>
          )
          return (
            <div key={m.id} className="space-y-1.5">
              {m.role === 'athlete' ? <Link href={`/atletas/${m.id}`}>{card}</Link> : card}
              {(isManager && m.role === 'athlete') || (isManager && m.role !== 'manager') ? (
                <div className="flex items-center gap-2 px-1">
                  {isManager && m.role === 'athlete' && (
                    <ReassignCoachSelect athleteMembershipId={m.id} currentCoachId={m.coachMembershipId} coaches={coaches} />
                  )}
                  {isManager && m.role !== 'manager' && <DeactivateButton id={m.id} />}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
