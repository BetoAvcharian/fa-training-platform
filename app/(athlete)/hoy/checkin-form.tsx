'use client'

import { useState, useTransition } from 'react'
import { submitCheckinAction } from './actions'

export function CheckinForm({ initialEnergia, initialFatiga, alreadySubmitted }: { initialEnergia: number | null; initialFatiga: number | null; alreadySubmitted: boolean }) {
  const [energia, setEnergia] = useState(initialEnergia ?? 3)
  const [fatiga, setFatiga] = useState(initialFatiga ?? 3)
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(alreadySubmitted)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await submitCheckinAction(formData)
      setSaved(true)
    })
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-navy mb-3">¿Cómo llegás hoy?</p>

      <form action={handleSubmit} className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-status-neutral mb-1">
            <span>Energía</span>
            <span className="font-medium text-navy">{energia}/5</span>
          </div>
          <input
            type="range"
            name="energia"
            min={1}
            max={5}
            value={energia}
            onChange={(e) => setEnergia(Number(e.target.value))}
            className="w-full accent-gold"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs text-status-neutral mb-1">
            <span>Fatiga</span>
            <span className="font-medium text-navy">{fatiga}/5</span>
          </div>
          <input
            type="range"
            name="fatiga"
            min={1}
            max={5}
            value={fatiga}
            onChange={(e) => setFatiga(Number(e.target.value))}
            className="w-full accent-gold"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full btn-primary py-2 text-sm"
        >
          {saved ? 'Actualizar check-in' : 'Guardar check-in'}
        </button>
      </form>
    </div>
  )
}
