'use client'

import { useState, useTransition } from 'react'
import { completeSessionLineAction } from './actions'
import { MarkValueInput } from '@/components/ui/mark-value-input'
import { formatMark } from '@/lib/format-mark'
import type { SessionExercise } from '@/domains/events/types'

interface Props {
  line: SessionExercise
  executed: { value: number; date: string; notes: string | null } | null
}

export function SessionLine({ line, executed }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleComplete(formData: FormData) {
    startTransition(async () => {
      await completeSessionLineAction(line.id, formData)
      setExpanded(false)
    })
  }

  return (
    <div className="flex items-start justify-between gap-3 bg-outline/40 rounded-lg px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ink">{line.rawText}</p>
        {!line.isStructured && (
          <p className="text-[11px] text-status-attention mt-0.5">Sin estructurar — tocá para completar igual</p>
        )}
        {executed && (
          <p className="text-[11px] text-status-positive mt-0.5">✓ Completado — real: {formatMark(executed.value, line.unitSymbol)}</p>
        )}
      </div>

      {!executed && line.isStructured && (
        <div className="shrink-0">
          {!expanded ? (
            <button onClick={() => setExpanded(true)} className="text-xs text-ink underline">
              Completar
            </button>
          ) : (
            <form action={handleComplete} className="flex items-center gap-1.5">
              <MarkValueInput name="actualValue" unitSymbol={line.unitSymbol} />
              <button type="submit" disabled={pending} className="text-xs bg-navy text-white rounded px-2 py-1 disabled:opacity-50">
                {pending ? '...' : 'OK'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
