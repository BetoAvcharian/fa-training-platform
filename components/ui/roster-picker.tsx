'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'

function initials(firstName?: string, lastName?: string) {
  return ((firstName?.[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase() || '?'
}

interface Entry {
  id: string
  status?: string
  person: { firstName: string; lastName: string } | null
}

/**
 * "Elegí un atleta" — pantalla compartida por Salud, Rendimiento y
 * cualquier otra sección que arranque pidiendo elegir de quién ver
 * algo. Buscador + avatar de iniciales en vez de una lista de cajas
 * blancas lisas.
 */
export function RosterPicker({ roster, basePath }: { roster: Entry[]; basePath: string }) {
  const [query, setQuery] = useState('')

  const sorted = useMemo(
    () =>
      [...roster].sort((a, b) =>
        (a.person ? `${a.person.firstName} ${a.person.lastName}` : '').localeCompare(
          b.person ? `${b.person.firstName} ${b.person.lastName}` : '',
          'es'
        )
      ),
    [roster]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter((r) => (r.person ? `${r.person.firstName} ${r.person.lastName}` : '').toLowerCase().includes(q))
  }, [sorted, query])

  return (
    <div className="space-y-3">
      {roster.length > 0 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre…"
          className="input-field"
        />
      )}

      {filtered.length === 0 && <p className="text-sm text-status-neutral">Sin resultados.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((entry) => (
          <Link
            key={entry.id}
            href={`${basePath}/${entry.id}`}
            className="card-hover p-3.5 flex items-center gap-3"
          >
            <div className="shrink-0 w-10 h-10 rounded-full bg-status-positive text-white flex items-center justify-center text-xs font-bold">
              {initials(entry.person?.firstName, entry.person?.lastName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink truncate">
                {entry.person ? `${entry.person.firstName} ${entry.person.lastName}` : '—'}
              </p>
              {entry.status && (
                <p className="text-xs text-status-neutral">{entry.status === 'activo' ? 'Activo' : entry.status}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
