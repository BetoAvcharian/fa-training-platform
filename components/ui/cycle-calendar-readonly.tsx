'use client'

import type { CycleFlow, CycleDayLog } from '@/domains/health/cycle-types'

const FLOW_COLORS: Record<CycleFlow, string> = {
  manchado: 'bg-red-200',
  ligero: 'bg-red-300',
  medio: 'bg-red-500',
  abundante: 'bg-red-700',
}

/** Igual que CycleCalendar pero sin popup de carga — para que un coach vea el calendario sin poder tocar los datos de la atleta. */
export function CycleCalendarReadOnly({
  days,
  logsByDate,
  predictedNextPeriod,
}: {
  days: Array<{ date: string; inMonth: boolean }>
  logsByDate: Map<string, CycleDayLog>
  predictedNextPeriod: string | null
}) {
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
                <div
                  key={d.date}
                  className={`aspect-square rounded-lg flex items-center justify-center text-xs relative ${
                    d.inMonth ? 'text-ink' : 'text-gray-300'
                  } ${log?.flow ? `${FLOW_COLORS[log.flow]} text-white font-medium` : 'bg-outline/30'} ${
                    isPredicted && !log?.flow ? 'ring-2 ring-red-300 ring-dashed' : ''
                  }`}
                >
                  {Number(d.date.slice(8, 10))}
                  {log && log.symptoms.length > 0 && (
                    <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-gold" />
                  )}
                </div>
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
    </div>
  )
}
