'use client'

import { useState, useTransition } from 'react'
import { createProtocolAction } from './actions'
import { Modal } from '@/components/ui/modal'

interface ObservableOption {
  id: string
  name: string
}

export function ProtocolForm({ observables }: { observables: ObservableOption[] }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createProtocolAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setOpen(false)
      }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-secondary px-4 py-2 text-sm">
        + Nuevo protocolo
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Nuevo protocolo">
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Nombre</label>
            <input name="name" placeholder="Ej: ISAK completo" className="input-field" required />
          </div>
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Qué pruebas incluye</label>
            <div className="max-h-60 overflow-y-auto space-y-1 border border-outline rounded-lg p-3">
              {observables.map((o) => (
                <label key={o.id} className="flex items-center gap-2 text-sm text-ink py-0.5">
                  <input type="checkbox" name="observableIds" value={o.id} />
                  {o.name}
                </label>
              ))}
            </div>
          </div>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={pending} className="flex-1 btn-primary py-2.5 text-sm">
              {pending ? 'Creando…' : 'Crear protocolo'}
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
