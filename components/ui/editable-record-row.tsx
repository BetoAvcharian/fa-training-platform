'use client'

import { useState, useTransition } from 'react'
import { formatMark } from '@/lib/format-mark'

export function EditableRecordRow({
  id,
  title,
  subtitle,
  value,
  unitSymbol,
  onEdit,
  onDelete,
}: {
  id: string
  title: string
  subtitle: string
  value: number
  unitSymbol: string | null
  onEdit: (id: string, value: number) => Promise<{ error: string | null } | undefined>
  onDelete: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const isTime = unitSymbol === 's'
  const [newValue, setNewValue] = useState(String(value))
  const [min, setMin] = useState(isTime ? String(Math.floor(value / 60)) : '')
  const [sec, setSec] = useState(isTime ? String(Math.round((value % 60) * 100) / 100) : '')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (confirming) {
    return (
      <div className="p-3 flex items-center justify-between text-sm bg-status-critical/5">
        <span className="text-status-neutral">¿Eliminar este registro?</span>
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() => startTransition(async () => onDelete(id))}
            className="btn-danger"
          >
            Sí, eliminar
          </button>
          <button onClick={() => setConfirming(false)} className="text-xs text-status-neutral">
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="p-3 text-sm">
        <p className="text-navy font-medium mb-1">{title}</p>
        <p className="text-xs text-status-neutral mb-2">{subtitle}</p>
        <div className="flex items-center gap-2">
          {isTime ? (
            <>
              <input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} placeholder="min" className="input-field w-16 text-center" />
              <span className="text-status-neutral text-sm">:</span>
              <input type="number" min={0} max={59.99} step="0.01" value={sec} onChange={(e) => setSec(e.target.value)} placeholder="seg" className="input-field w-20 text-center" />
              <span className="text-xs text-status-neutral">min:seg</span>
            </>
          ) : (
            <>
              <input
                type="number"
                step="0.01"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="input-field w-28"
              />
              {unitSymbol && <span className="text-xs text-status-neutral">{unitSymbol}</span>}
            </>
          )}
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const finalValue = isTime ? (Number(min) || 0) * 60 + (Number(sec) || 0) : Number(newValue)
                const result = await onEdit(id, finalValue)
                if (result?.error) setError(result.error)
                else {
                  setError(null)
                  setEditing(false)
                }
              })
            }
            className="btn-primary px-3 py-1.5 text-xs"
          >
            Guardar
          </button>
          <button onClick={() => setEditing(false)} className="text-xs text-status-neutral">
            Cancelar
          </button>
        </div>
        {error && <p className="text-xs text-status-critical mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="p-3 flex items-center justify-between text-sm group">
      <div>
        <p className="text-navy font-medium">{title}</p>
        <p className="text-xs text-status-neutral">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <p className="font-semibold text-navy">{formatMark(value, unitSymbol)}</p>
        <div className="flex gap-2">
          <button onClick={() => setEditing(true)} className="text-xs text-navy underline">
            Editar
          </button>
          <button onClick={() => setConfirming(true)} className="text-xs text-status-critical underline">
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}
