'use client'

import { useState, useRef, useTransition } from 'react'
import { updatePlanDatesAction } from './actions'

interface PlanBar {
  id: string
  type: 'macrociclo' | 'mesociclo'
  title: string
  startDate: string
  endDate: string
  parentPlanId: string | null
  objectiveText: string | null
}
interface CompetitionMarker {
  id: string
  title: string
  date: string
}

const WEEK_WIDTH = 34
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function mondayOf(date: Date) {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function toISO(d: Date) {
  return d.toISOString().slice(0, 10)
}

export function AnnualGrid({
  year,
  macrociclos,
  mesociclos,
  competitions,
}: {
  year: number
  macrociclos: PlanBar[]
  mesociclos: PlanBar[]
  competitions: CompetitionMarker[]
}) {
  const yearStart = mondayOf(new Date(year, 0, 1))
  const weeks = 53
  const totalWidth = weeks * WEEK_WIDTH

  function weekIndexOf(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return Math.round((d.getTime() - yearStart.getTime()) / (7 * 86400000))
  }
  function dateOfWeekIndex(idx: number) {
    return toISO(new Date(yearStart.getTime() + idx * 7 * 86400000))
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div style={{ width: totalWidth, minWidth: totalWidth }} className="relative">
        {/* Meses */}
        <div className="flex text-[10px] text-status-neutral border-b border-outline pb-1 sticky top-0 bg-panel z-10">
          {MONTH_LABELS.map((m, i) => (
            <div key={m} style={{ width: WEEK_WIDTH * 4.33 }} className="shrink-0">
              {m}
            </div>
          ))}
        </div>

        {/* Macrociclos */}
        <div className="relative h-8 mt-2">
          {macrociclos.map((p) => {
            const s = Math.max(0, weekIndexOf(p.startDate))
            const e = Math.min(weeks, weekIndexOf(p.endDate) + 1)
            return (
              <div
                key={p.id}
                className="absolute h-7 rounded-lg bg-navy/10 border border-navy/30 flex items-center px-2 text-[10px] font-medium text-ink truncate"
                style={{ left: s * WEEK_WIDTH, width: Math.max((e - s) * WEEK_WIDTH, 20) }}
                title={p.title}
              >
                {p.title}
              </div>
            )
          })}
        </div>

        {/* Mesociclos — arrastrables */}
        <div className="relative mt-2" style={{ height: Math.max(mesociclos.length, 1) * 34 }}>
          {mesociclos.map((p, row) => (
            <MesocicloBar
              key={p.id}
              plan={p}
              row={row}
              weekIndexOf={weekIndexOf}
              dateOfWeekIndex={dateOfWeekIndex}
              maxWeeks={weeks}
            />
          ))}
        </div>

        {/* Semanas (grilla de fondo) */}
        <div className="flex mt-1 border-t border-outline pt-1">
          {Array.from({ length: weeks }, (_, i) => (
            <div key={i} className="shrink-0 text-center text-[8px] text-status-neutral/60" style={{ width: WEEK_WIDTH }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Competencias */}
        <div className="relative h-8 mt-1">
          {competitions.map((c) => {
            const idx = weekIndexOf(c.date)
            if (idx < 0 || idx >= weeks) return null
            return (
              <div
                key={c.id}
                className="absolute flex flex-col items-center"
                style={{ left: idx * WEEK_WIDTH + WEEK_WIDTH / 2 - 6 }}
                title={`${c.title} — ${c.date}`}
              >
                <span className="text-sm">🏁</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MesocicloBar({
  plan,
  row,
  weekIndexOf,
  dateOfWeekIndex,
  maxWeeks,
}: {
  plan: PlanBar
  row: number
  weekIndexOf: (d: string) => number
  dateOfWeekIndex: (i: number) => string
  maxWeeks: number
}) {
  const [pending, startTransition] = useTransition()
  const [localStart, setLocalStart] = useState(weekIndexOf(plan.startDate))
  const [localEnd, setLocalEnd] = useState(weekIndexOf(plan.endDate) + 1)
  const dragRef = useRef<{ edge: 'left' | 'right'; startX: number; origStart: number; origEnd: number } | null>(null)

  function onPointerDown(edge: 'left' | 'right', e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { edge, startX: e.clientX, origStart: localStart, origEnd: localEnd }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const deltaWeeks = Math.round((e.clientX - dragRef.current.startX) / WEEK_WIDTH)
    if (dragRef.current.edge === 'left') {
      const next = Math.min(Math.max(dragRef.current.origStart + deltaWeeks, 0), localEnd - 1)
      setLocalStart(next)
    } else {
      const next = Math.max(Math.min(dragRef.current.origEnd + deltaWeeks, maxWeeks), localStart + 1)
      setLocalEnd(next)
    }
  }
  function onPointerUp() {
    if (!dragRef.current) return
    dragRef.current = null
    const newStart = dateOfWeekIndex(localStart)
    const newEnd = dateOfWeekIndex(localEnd - 1)
    startTransition(async () => {
      await updatePlanDatesAction(plan.id, newStart, newEnd)
    })
  }

  return (
    <div
      className="absolute h-7 rounded-md bg-gold/20 border border-gold flex items-center text-[10px] text-navy px-1.5 group"
      style={{ left: localStart * WEEK_WIDTH, width: (localEnd - localStart) * WEEK_WIDTH, top: row * 34 }}
    >
      <div
        onPointerDown={(e) => onPointerDown('left', e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="w-2 h-full cursor-ew-resize shrink-0 -ml-1.5 opacity-0 group-hover:opacity-100 bg-gold rounded-l"
      />
      <span className="truncate flex-1 px-1">
        {plan.title}
        {plan.objectiveText && <span className="text-navy/70"> — {plan.objectiveText}</span>}
      </span>
      <div
        onPointerDown={(e) => onPointerDown('right', e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="w-2 h-full cursor-ew-resize shrink-0 -mr-1.5 opacity-0 group-hover:opacity-100 bg-gold rounded-r"
      />
      {pending && <span className="absolute -top-4 left-0 text-[9px] text-status-neutral">guardando…</span>}
    </div>
  )
}
