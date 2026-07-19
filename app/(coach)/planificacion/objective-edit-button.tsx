'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/modal'
import { updateObjectiveAction, deleteObjectiveAction } from './actions'

const CATEGORY_OPTIONS = [
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'salud', label: 'Salud' },
  { value: 'fisico', label: 'Físico' },
  { value: 'personal', label: 'Personal' },
]

interface ObjectiveForEdit {
  id: string
  category: string
  description: string | null
  targetDate: string | null
}

export function ObjectiveEditButton({ objective }: { objective: ObjectiveForEdit }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateObjectiveAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    if (!confirm('¿Borrar este objetivo?')) return
    startTransition(async () => {
      const result = await deleteObjectiveAction(objective.id)
      if (result?.error) setError(result.error)
      else setOpen(false)
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-status-neutral hover:text-gold text-xs shrink-0" aria-label="Editar">
        ✎
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar objetivo">
        <form action={handleSubmit} className="space-y-3">
          <input type="hidden" name="id" value={objective.id} />
          <select name="category" defaultValue={objective.category} className="input-field" required>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <textarea name="description" defaultValue={objective.description ?? ''} className="input-field" rows={2} required />
          <input name="targetDate" type="date" defaultValue={objective.targetDate ?? ''} className="input-field" />
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending} className="flex-1 btn-primary py-2 text-sm">
              Guardar
            </button>
            <button type="button" disabled={pending} onClick={handleDelete} className="btn-danger px-3">
              Borrar
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-4 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
