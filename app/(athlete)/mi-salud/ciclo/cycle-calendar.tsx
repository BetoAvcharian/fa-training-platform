'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/modal'
import { logCycleDayAction, deleteCycleDayAction } from './actions'
import { SYMPTOM_OPTIONS, type CycleFlow, type CycleDayLog } from '@/domains/health/cycle-types'

const FLOW_OPTIONS: Array<{ value: CycleFlow; label: string }> = [
  { value: 'manchado', label: 'Manchado' },
  { value: 'ligero', label: 'Ligero' },
  { value: 'medio', label: 'Medio' },
  { value: 'abundante', label: 'Abundante' },
]

const FLOW_COLORS: Record<CycleFlow, string> = {
  manchado: 'bg-red-200',
  ligero: 'bg-red-300',
  medio: 'bg-red-500',
  abundante: 'bg-red-700',
}

export function CycleCalendar({
  days,
  logsByDate,
  predictedNextPeriod,
}: {
  days: Array<{ date: string; inMonth: boolean; dayOfWeek: number }>
  logsByDate: Map<string, CycleDayLog>
  predictedNextPeriod: string | null
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const weeks: Array<typeof days> = []
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))

  return (
    <div>
      <div className="grid grid-cols-7 text-center text-[10px] text-status-neutral uppercase mb-1">
        {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((d) => {
              const log = logsByDate.get(d.date)
              const isPredicted = d.date === predictedNextPeriod
              return (
                <button
                  key={d.date}
                  onClick={() => setSelectedDate(d.date)}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs relative ${
                    d.inMonth ? 'text-ink' : 'text-gray-300'
                  } ${log?.flow ? `${FLOW_COLORS[log.flow]} text-white font-medium` : 'bg-gray-50'} ${
                    isPredicted && !log?.flow ? 'ring-2 ring-red-300 ring-dashed' : ''
                  }`}
                >
                  {Number(d.date.slice(8, 10))}
                  {log && log.symptoms.length > 0 && (
                    <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-gold" />
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-3 text-[10px] text-status-neutral">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> sangrado
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full ring-2 ring-red-300 inline-block" /> predicción
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" /> síntomas
        </span>
      </div>

      {selectedDate && (
        <DayModal date={selectedDate} log={logsByDate.get(selectedDate) ?? null} onClose={() => setSelectedDate(null)} />
      )}
    </div>
  )
}

function DayModal({ date, log, onClose }: { date: string; log: CycleDayLog | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [flow, setFlow] = useState<CycleFlow | ''>(log?.flow ?? '')
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set(log?.symptoms ?? []))
  const [error, setError] = useState<string | null>(null)

  function toggleSymptom(s: string) {
    const next = new Set(symptoms)
    if (next.has(s)) next.delete(s)
    else next.add(s)
    setSymptoms(next)
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await logCycleDayAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        onClose()
      }
    })
  }

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <Modal open onClose={onClose} title={formattedDate}>
      <form action={handleSubmit} className="space-y-4">
        <input type="hidden" name="date" value={date} />

        <div>
          <label className="text-xs text-status-neutral mb-1 block">Sangrado</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFlow('')}
              className={`text-xs rounded-full px-3 py-1.5 border ${flow === '' ? 'bg-navy text-white border-navy' : 'border-outline text-status-neutral'}`}
            >
              Nada
            </button>
            {FLOW_OPTIONS.map((f) => (
              <button
                type="button"
                key={f.value}
                onClick={() => setFlow(f.value)}
                className={`text-xs rounded-full px-3 py-1.5 border ${
                  flow === f.value ? `${FLOW_COLORS[f.value]} text-white border-transparent` : 'border-outline text-status-neutral'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input type="hidden" name="flow" value={flow} />
        </div>

        <div>
          <label className="text-xs text-status-neutral mb-1 block">Síntomas</label>
          <div className="flex flex-wrap gap-2">
            {SYMPTOM_OPTIONS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => toggleSymptom(s)}
                className={`text-xs rounded-full px-3 py-1.5 border capitalize ${
                  symptoms.has(s) ? 'bg-gold text-navy border-gold font-medium' : 'border-outline text-status-neutral'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {Array.from(symptoms).map((s) => (
            <input key={s} type="hidden" name="symptoms" value={s} />
          ))}
        </div>

        <div>
          <label className="text-xs text-status-neutral mb-1 block">Notas (opcional)</label>
          <textarea name="notes" defaultValue={log?.notes ?? ''} rows={2} className="input-field" />
        </div>

        {error && <p className="text-xs text-status-critical">{error}</p>}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={pending} className="flex-1 btn-primary py-2.5 text-sm">
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
          {log && (
            <button
              type="button"
              disabled={pending}
              onClick={() => startTransition(async () => { await deleteCycleDayAction(log.id); onClose() })}
              className="btn-danger px-4 text-sm"
            >
              Borrar
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary px-4 text-sm">
            Cerrar
          </button>
        </div>
      </form>
    </Modal>
  )
}
