'use client'

import { useState, useRef, useTransition } from 'react'
import { updatePlanDatesAction, updatePlanAction, deletePlanAction } from './actions'
import { Modal } from '@/components/ui/modal'
import { ObjectiveEditModal } from './objective-edit-modal'
import { getTodayISO } from '@/lib/today'

interface ObjectiveInfo {
  id: string
  category: string
  description: string
  targetDate: string | null
}
interface PlanBar {
  id: string
  type: 'macrociclo' | 'mesociclo'
  title: string
  startDate: string
  endDate: string
  parentPlanId: string | null
  objectives: ObjectiveInfo[]
}
interface CompetitionMarker {
  id: string
  title: string
  date: string
}

const WEEK_WIDTH = 34
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const CATEGORY_LABELS: Record<string, string> = { deportivo: 'Deportivo', salud: 'Salud', fisico: 'Físico', personal: 'Personal' }
const CATEGORY_ICONS: Record<string, string> = { deportivo: '🏃', salud: '❤️', fisico: '💪', personal: '🎯' }

const MACRO_PALETTE = [
  { bg: 'bg-[#1E3A5F]/15', border: 'border-[#1E3A5F]/50', text: 'text-[#1E3A5F]', solid: '#1E3A5F' },
  { bg: 'bg-[#0F766E]/15', border: 'border-[#0F766E]/50', text: 'text-[#0F766E]', solid: '#0F766E' },
  { bg: 'bg-[#C2570B]/15', border: 'border-[#C2570B]/50', text: 'text-[#C2570B]', solid: '#C2570B' },
  { bg: 'bg-[#7C3AED]/15', border: 'border-[#7C3AED]/50', text: 'text-[#7C3AED]', solid: '#7C3AED' },
  { bg: 'bg-[#4D7C4D]/15', border: 'border-[#4D7C4D]/50', text: 'text-[#4D7C4D]', solid: '#4D7C4D' },
  { bg: 'bg-[#BE185D]/15', border: 'border-[#BE185D]/50', text: 'text-[#BE185D]', solid: '#BE185D' },
]
const MACRO_ICONS = ['🔥', '⚡', '🏆', '🌊', '🌿', '✨']

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
function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
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
  const [detail, setDetail] = useState<PlanBar | null>(null)
  const [compDetail, setCompDetail] = useState<CompetitionMarker | null>(null)

  const yearStart = mondayOf(new Date(year, 0, 1))
  const weeks = 53
  const totalWidth = weeks * WEEK_WIDTH
  const todayWeek = year === new Date(getTodayISO() + 'T00:00:00').getFullYear() ? weekIndexOfStatic(getTodayISO(), yearStart) : null

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
        <div className="flex text-[10px] text-status-neutral border-b border-outline pb-1 sticky top-0 bg-panel z-10">
          {MONTH_LABELS.map((m, i) => (
            <div
              key={m}
              style={{ width: WEEK_WIDTH * 4.33 }}
              className={`shrink-0 font-medium ${i % 2 === 0 ? 'text-ink' : 'text-status-neutral'}`}
            >
              {m}
            </div>
          ))}
        </div>

        {todayWeek !== null && todayWeek >= 0 && todayWeek < weeks && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-gold z-[5] pointer-events-none"
            style={{ left: todayWeek * WEEK_WIDTH + WEEK_WIDTH / 2 }}
          >
            <span className="absolute -top-5 -translate-x-1/2 text-[9px] text-gold font-bold whitespace-nowrap">HOY ▾</span>
          </div>
        )}

        <div className="relative h-9 mt-6">
          {macrociclos.map((p, i) => {
            const s = Math.max(0, weekIndexOf(p.startDate))
            const e = Math.min(weeks, weekIndexOf(p.endDate) + 1)
            const c = MACRO_PALETTE[i % MACRO_PALETTE.length]
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setDetail(p)}
                className={`absolute h-8 rounded-full ${c.bg} border-2 ${c.border} flex items-center gap-1 px-3 text-[11px] font-semibold ${c.text} truncate text-left shadow-sm hover:shadow-md transition-shadow`}
                style={{ left: s * WEEK_WIDTH, width: Math.max((e - s) * WEEK_WIDTH, 24) }}
              >
                <span>{MACRO_ICONS[i % MACRO_ICONS.length]}</span>
                <span className="truncate">{p.title}</span>
              </button>
            )
          })}
        </div>

        <div className="relative mt-3" style={{ height: Math.max(mesociclos.length, 1) * 36 }}>
          {mesociclos.map((p, row) => (
            <MesocicloBar
              key={p.id}
              plan={p}
              row={row}
              weekIndexOf={weekIndexOf}
              dateOfWeekIndex={dateOfWeekIndex}
              maxWeeks={weeks}
              onOpenDetail={() => setDetail(p)}
            />
          ))}
        </div>

        <div className="flex mt-2 border-t border-outline pt-1">
          {Array.from({ length: weeks }, (_, i) => (
            <div key={i} className="shrink-0 text-center text-[8px] text-status-neutral/60" style={{ width: WEEK_WIDTH }}>
              {i + 1}
            </div>
          ))}
        </div>

        <div className="relative h-10 mt-1">
          {competitions.map((c) => {
            const idx = weekIndexOf(c.date)
            if (idx < 0 || idx >= weeks) return null
            return (
              <button
                type="button"
                key={c.id}
                onClick={() => setCompDetail(c)}
                className="absolute flex flex-col items-center group"
                style={{ left: idx * WEEK_WIDTH + WEEK_WIDTH / 2 - 10 }}
              >
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-gold to-[#C2570B] flex items-center justify-center text-[10px] shadow-md group-hover:scale-110 transition-transform">
                  🏆
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-outline">
        <span className="flex items-center gap-1.5 text-[10px] text-status-neutral">
          <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-gold/60 to-[#C2570B]/60 border border-gold" /> Mesociclo
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-status-neutral">
          <span className="w-3 h-0.5 bg-gold" /> Hoy
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-status-neutral">🏆 Competencia</span>
      </div>

      {detail && <DetailEditModal plan={detail} onClose={() => setDetail(null)} />}

      {compDetail && (
        <Modal open onClose={() => setCompDetail(null)} title={`🏆 ${compDetail.title}`}>
          <p className="text-sm text-ink">{formatDate(compDetail.date)}</p>
          <p className="text-[11px] text-status-neutral mt-2">Se edita desde Calendario o Competencias.</p>
        </Modal>
      )}
    </div>
  )
}

function weekIndexOfStatic(dateStr: string, yearStart: Date) {
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d.getTime() - yearStart.getTime()) / (7 * 86400000))
}

/** El popup que se abre al tocar un bloque — ahora editable de verdad: título, fechas, y cada objetivo con su propio lápiz. */
function DetailEditModal({ plan, onClose }: { plan: PlanBar; onClose: () => void }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editingObjective, setEditingObjective] = useState<ObjectiveInfo | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updatePlanAction(formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        onClose()
      }
    })
  }

  function handleDelete() {
    if (!confirm('¿Borrar este bloque? Si tiene hijos también se van a borrar.')) return
    startTransition(async () => {
      const result = await deletePlanAction(plan.id)
      if (result?.error) setError(result.error)
      else onClose()
    })
  }

  return (
    <>
      <Modal open onClose={onClose} title={plan.type === 'macrociclo' ? '🔥 Editar macrociclo' : '⚙️ Editar mesociclo'}>
        <form action={handleSubmit} className="space-y-3">
          <input type="hidden" name="id" value={plan.id} />
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Título</label>
            <input name="title" defaultValue={plan.title} required className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-status-neutral mb-1 block">Fecha inicio</label>
              <input name="startDate" type="date" defaultValue={plan.startDate} className="input-field" />
            </div>
            <div>
              <label className="text-xs text-status-neutral mb-1 block">Fecha fin</label>
              <input name="endDate" type="date" defaultValue={plan.endDate} className="input-field" />
            </div>
          </div>
          {error && <p className="text-xs text-status-critical">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="flex-1 btn-primary py-2 text-sm">
              Guardar
            </button>
            <button type="button" disabled={pending} onClick={handleDelete} className="btn-danger px-3">
              Borrar
            </button>
          </div>

          <div className="pt-3 border-t border-outline">
            <p className="text-xs text-status-neutral uppercase tracking-wide mb-2">Objetivos</p>
            {plan.objectives.length === 0 ? (
              <p className="text-sm text-status-neutral">Sin objetivos cargados para este bloque.</p>
            ) : (
              <div className="space-y-2">
                {plan.objectives.map((o) => (
                  <div key={o.id} className="rounded-xl border border-outline bg-gradient-to-br from-surface to-outline/20 p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wide text-gold font-semibold flex items-center gap-1">
                        <span>{CATEGORY_ICONS[o.category] ?? '📌'}</span> {CATEGORY_LABELS[o.category] ?? o.category}
                      </p>
                      <p className="text-sm text-ink mt-1">{o.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingObjective(o)}
                      className="text-status-neutral hover:text-gold text-xs shrink-0"
                      aria-label="Editar objetivo"
                    >
                      ✎
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Modal>

      {editingObjective && (
        <ObjectiveEditModal objective={editingObjective} open onClose={() => setEditingObjective(null)} />
      )}
    </>
  )
}

function MesocicloBar({
  plan,
  row,
  weekIndexOf,
  dateOfWeekIndex,
  maxWeeks,
  onOpenDetail,
}: {
  plan: PlanBar
  row: number
  weekIndexOf: (d: string) => number
  dateOfWeekIndex: (i: number) => string
  maxWeeks: number
  onOpenDetail: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [localStart, setLocalStart] = useState(weekIndexOf(plan.startDate))
  const [localEnd, setLocalEnd] = useState(weekIndexOf(plan.endDate) + 1)
  const dragRef = useRef<{ edge: 'left' | 'right'; startX: number; origStart: number; origEnd: number; moved: boolean } | null>(null)

  function onPointerDown(edge: 'left' | 'right', e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { edge, startX: e.clientX, origStart: localStart, origEnd: localEnd, moved: false }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const deltaWeeks = Math.round((e.clientX - dragRef.current.startX) / WEEK_WIDTH)
    if (deltaWeeks !== 0) dragRef.current.moved = true
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
    const moved = dragRef.current.moved
    dragRef.current = null
    if (!moved) return
    const newStart = dateOfWeekIndex(localStart)
    const newEnd = dateOfWeekIndex(localEnd - 1)
    startTransition(async () => {
      await updatePlanDatesAction(plan.id, newStart, newEnd)
    })
  }

  return (
    <div
      className="absolute h-8 rounded-lg bg-gradient-to-r from-gold/25 to-[#C2570B]/20 border border-gold flex items-center text-[10px] text-navy px-1.5 group shadow-sm"
      style={{ left: localStart * WEEK_WIDTH, width: (localEnd - localStart) * WEEK_WIDTH, top: row * 36 }}
    >
      <div
        onPointerDown={(e) => onPointerDown('left', e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="w-2 h-full cursor-ew-resize shrink-0 -ml-1.5 opacity-0 group-hover:opacity-100 bg-gold rounded-l"
      />
      <button type="button" onClick={onOpenDetail} className="truncate flex-1 px-1 text-left flex items-center gap-1">
        <span className="shrink-0">⚙️</span>
        <span className="truncate">
          {plan.title}
          {plan.objectives[0] && <span className="text-navy/70"> — {plan.objectives[0].description}</span>}
        </span>
      </button>
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
