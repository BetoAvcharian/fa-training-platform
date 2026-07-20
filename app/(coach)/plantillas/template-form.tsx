'use client'

import { useState, useTransition } from 'react'
import { createTemplateAction } from './actions'
import { Modal } from '@/components/ui/modal'

export function TemplateForm() {
  const [open, setOpen] = useState(false)
  const [lines, setLines] = useState<Array<{ text: string; sport: 'Atletismo' | 'Fuerza' }>>([{ text: '', sport: 'Atletismo' }])
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function updateLine(i: number, patch: Partial<{ text: string; sport: 'Atletismo' | 'Fuerza' }>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function handleSubmit(formData: FormData) {
    for (const l of lines) {
      if (l.text.trim()) {
        formData.append('lineText', l.text)
        formData.append('lineSport', l.sport)
      }
    }
    startTransition(async () => {
      const result = await createTemplateAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setError(null)
        setOpen(false)
        setLines([{ text: '', sport: 'Atletismo' }])
      }
    })
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary px-4 py-2 text-sm">
        + Nueva plantilla
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Nueva plantilla de entrenamiento">
        <form action={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Título</label>
            <input name="title" placeholder="Ej: Series de velocidad" required className="input-field" />
          </div>

          <div>
            <label className="text-xs text-status-neutral mb-1 block">Ejercicios</label>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <select value={line.sport} onChange={(e) => updateLine(i, { sport: e.target.value as 'Atletismo' | 'Fuerza' })} className="input-field w-24">
                    <option value="Atletismo">Atl.</option>
                    <option value="Fuerza">Fza.</option>
                  </select>
                  <input
                    value={line.text}
                    onChange={(e) => updateLine(i, { text: e.target.value })}
                    placeholder={line.sport === 'Atletismo' ? "4x400m 1:15 r2'" : 'Sentadilla 4x8x120kg'}
                    className="flex-1 min-w-0 input-field"
                  />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setLines((prev) => [...prev, { text: '', sport: 'Atletismo' }])} className="text-xs text-navy underline mt-2">
              + Agregar otro ejercicio
            </button>
          </div>

          {error && <p className="text-xs text-status-critical">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={pending} className="flex-1 btn-primary py-2 text-sm">
              Guardar plantilla
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
