'use client'

import { useState, useTransition } from 'react'
import { createCompetitionAction } from './actions'
import { Modal } from '@/components/ui/modal'

export function CompetitionForm() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createCompetitionAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full btn-primary py-2.5 text-sm">
        + Nueva competencia
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nueva competencia">
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Nombre</label>
            <input name="title" placeholder="Ej: Provincial U18" className="input-field" required />
          </div>
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Fecha</label>
            <input name="date" type="date" className="input-field" required />
          </div>
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Lugar</label>
            <input name="location" placeholder="Ej: Estadio Charrúa, Montevideo" className="input-field" />
          </div>
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Link de Google Maps (opcional)</label>
            <input name="locationMapUrl" placeholder="https://maps.google.com/…" className="input-field" />
          </div>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={pending} className="flex-1 btn-primary py-2.5 text-sm">
              {pending ? 'Creando…' : 'Crear competencia'}
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
