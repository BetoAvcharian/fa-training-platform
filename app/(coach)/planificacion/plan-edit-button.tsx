'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/modal'
import { updatePlanAction, deletePlanAction } from './actions'

interface PlanForEdit {
  id: string
  title: string
  startDate: string | null
  endDate: string | null
}

export function PlanEditButton({ plan }: { plan: PlanForEdit }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePlanAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setOpen(false)
      }
    })
  }

  function handleDelete() {
    if (!confirm('¿Borrar este plan? Si tiene planes hijos (mesociclos, microciclos) también se van a borrar.')) return
    startTransition(async () => {
      const result = await deletePlanAction(plan.id)
      if (result?.error) setError(result.error)
      else setOpen(false)
    })
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-status-neutral hover:text-gold text-xs shrink-0" aria-label="Editar">
        ✎
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Editar plan">
        <form action={handleSubmit} className="space-y-3">
          <input type="hidden" name="id" value={plan.id} />
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Título</label>
            <input name="title" defaultValue={plan.title} required className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-status-neutral mb-1 block">Fecha inicio</label>
              <input name="startDate" type="date" defaultValue={plan.startDate ?? ''} className="input-field" />
            </div>
            <div>
              <label className="text-xs text-status-neutral mb-1 block">Fecha fin</label>
              <input name="endDate" type="date" defaultValue={plan.endDate ?? ''} className="input-field" />
            </div>
          </div>
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
