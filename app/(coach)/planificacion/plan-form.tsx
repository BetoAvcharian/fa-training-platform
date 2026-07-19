'use client'

import { useState, useTransition } from 'react'
import { createPlanAction } from './actions'
import { Modal } from '@/components/ui/modal'

const TYPE_OPTIONS = [
  { value: 'temporada', label: 'Temporada' },
  { value: 'macrociclo', label: 'Macrociclo' },
  { value: 'mesociclo', label: 'Mesociclo' },
  { value: 'microciclo', label: 'Microciclo' },
]

export function PlanForm({ plans }: { plans: Array<{ id: string; title: string; type: string }> }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createPlanAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setError(null)
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-outline bg-panel px-4 py-2 text-sm font-medium text-ink"
      >
        + Nuevo plan
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo plan">
        <form action={handleSubmit} className="space-y-3">
          <select name="type" className="input-field" required>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {plans.length > 0 && (
            <select name="parentPlanId" className="input-field">
              <option value="">Sin padre (raíz / temporada)</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.type})
                </option>
              ))}
            </select>
          )}
          <input name="title" placeholder="Título (ej: Temporada 2026)" className="input-field" required />
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="flex-1 btn-primary py-2 text-sm">
              Guardar
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
