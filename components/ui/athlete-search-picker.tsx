'use client'

import { useState, useMemo, useRef, useEffect } from 'react'

interface RosterOption {
  id: string
  person: { firstName: string; lastName: string } | null
}

/**
 * Reemplazo de un <select> de atleta por un buscador real — sigue
 * mandando el mismo `name` en el FormData que un <select> normal,
 * así los server actions existentes no necesitan cambiar nada.
 */
export function AthleteSearchPicker({
  name,
  roster,
  defaultValue,
  required,
  placeholder = 'Buscar atleta…',
  emptyLabel,
}: {
  name: string
  roster: RosterOption[]
  defaultValue?: string
  required?: boolean
  placeholder?: string
  emptyLabel?: string
}) {
  const [selectedId, setSelectedId] = useState(defaultValue ?? '')
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const nameOf = (r: RosterOption) => (r.person ? `${r.person.firstName} ${r.person.lastName}` : '—')
  const selected = roster.find((r) => r.id === selectedId)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return roster
    return roster.filter((r) => nameOf(r).toLowerCase().includes(q))
  }, [roster, query])

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selectedId} required={required} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input-field text-left flex items-center justify-between"
      >
        <span className={selected ? 'text-ink' : 'text-status-neutral'}>
          {selected ? nameOf(selected) : emptyLabel ?? 'Atleta'}
        </span>
        <span className="text-status-neutral text-xs">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-panel border border-outline rounded-lg shadow-lg overflow-hidden">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2 text-sm bg-panel text-ink border-b border-outline outline-none"
          />
          <div className="max-h-48 overflow-y-auto">
            {emptyLabel && (
              <button
                type="button"
                onClick={() => {
                  setSelectedId('')
                  setQuery('')
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-outline/40 ${selectedId === '' ? 'text-navy font-medium bg-gold/10' : 'text-ink'}`}
              >
                {emptyLabel}
              </button>
            )}
            {filtered.map((r) => (
              <button
                type="button"
                key={r.id}
                onClick={() => {
                  setSelectedId(r.id)
                  setQuery('')
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-outline/40 ${r.id === selectedId ? 'text-navy font-medium bg-gold/10' : 'text-ink'}`}
              >
                {nameOf(r)}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-status-neutral">Sin resultados.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
