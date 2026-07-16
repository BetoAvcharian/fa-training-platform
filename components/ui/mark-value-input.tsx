'use client'

import { useState } from 'react'

/**
 * El problema real: "2,30" para una marca de tiempo es ambiguo (¿2.30
 * segundos? ¿2 minutos 30?) y un número pelado sin la unidad al lado
 * invita a cargar "400" pensando en metros cuando el campo es
 * segundos. Para unitSymbol === 's' partimos el input en minutos y
 * segundos por separado (sin ambigüedad posible); para todo lo demás,
 * mostramos la unidad pegada al campo, siempre.
 *
 * Expone el valor total ya convertido a la unidad base (segundos, kg,
 * m, etc.) en un input oculto con el `name` pedido, para que el form
 * que lo contiene no tenga que saber nada de esto.
 */
export function MarkValueInput({ name, unitSymbol, defaultValue }: { name: string; unitSymbol: string | null; defaultValue?: number }) {
  const isTime = unitSymbol === 's'
  const initialMin = isTime && defaultValue !== undefined ? Math.floor(defaultValue / 60) : undefined
  const initialSec = isTime && defaultValue !== undefined ? Math.round((defaultValue % 60) * 100) / 100 : undefined

  const [min, setMin] = useState<string>(initialMin !== undefined ? String(initialMin) : '')
  const [sec, setSec] = useState<string>(initialSec !== undefined ? String(initialSec) : '')

  if (isTime) {
    const total = (Number(min) || 0) * 60 + (Number(sec) || 0)
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          value={min}
          onChange={(e) => setMin(e.target.value)}
          placeholder="min"
          className="input-field w-16 text-center"
        />
        <span className="text-status-neutral text-sm">:</span>
        <input
          type="number"
          min={0}
          max={59.99}
          step="0.01"
          value={sec}
          onChange={(e) => setSec(e.target.value)}
          placeholder="seg"
          className="input-field w-20 text-center"
        />
        <span className="text-xs text-status-neutral">min:seg</span>
        <input type="hidden" name={name} value={min || sec ? total : ''} />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5">
      <input name={name} type="number" step="0.01" defaultValue={defaultValue} placeholder="Valor" className="input-field w-28" />
      <span className="text-xs text-status-neutral whitespace-nowrap">{unitSymbol ?? '(elegí la prueba)'}</span>
    </div>
  )
}
