'use client'

import { useState } from 'react'
import { PlanEditModal, type PlanForEdit } from './plan-edit-modal'

export function PlanEditButton({ plan }: { plan: PlanForEdit }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-status-neutral hover:text-gold text-xs shrink-0" aria-label="Editar">
        ✎
      </button>
      <PlanEditModal plan={plan} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
