'use client'

import { useState } from 'react'
import { ObjectiveEditModal, type ObjectiveForEdit } from './objective-edit-modal'

export function ObjectiveEditButton({ objective }: { objective: ObjectiveForEdit }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-status-neutral hover:text-gold text-xs shrink-0" aria-label="Editar">
        ✎
      </button>
      <ObjectiveEditModal objective={objective} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
