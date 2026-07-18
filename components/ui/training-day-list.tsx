'use client'

import { useState } from 'react'

export interface AthleteFeedbackRow {
  athleteMembershipId: string
  athleteName: string
  status: 'completado' | 'completado_con_observacion' | 'no_completado' | null
  notes: string | null
  energia: number | null
}

export interface DayTraining {
  id: string
  title: string
  type: string
  location: string | null
  lines: string[]
  feedback: AthleteFeedbackRow[]
}

const STATUS_LABEL: Record<string, string> = {
  completado: 'Completado',
  completado_con_observacion: 'Con observación',
  no_completado: 'No completado',
}

function statusDot(status: string | null) {
  if (status === 'completado') return 'bg-status-positive'
  if (status === 'completado_con_observacion') return 'bg-status-attention'
  if (status === 'no_completado') return 'bg-status-critical'
  return 'bg-outline border border-status-neutral/40'
}

function overallBorder(feedback: AthleteFeedbackRow[]) {
  if (feedback.length === 0) return 'border-outline'
  if (feedback.some((f) => f.status === 'no_completado')) return 'border-status-critical'
  if (feedback.every((f) => f.status === 'completado')) return 'border-status-positive'
  if (feedback.some((f) => f.status)) return 'border-status-attention'
  return 'border-outline'
}

const TYPE_LABELS: Record<string, string> = {
  entrenamiento: 'Entrenamiento',
  competencia: 'Competencia',
  viaje: 'Viaje',
  concentracion: 'Concentración',
  medico: 'Médico',
  reunion: 'Reunión',
}

export function TrainingDayList({ trainings }: { trainings: DayTraining[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (trainings.length === 0) {
    return <p className="text-sm text-status-neutral">Nada agendado este día.</p>
  }

  return (
    <div className="space-y-2">
      {trainings.map((t) => {
        const withFeedback = t.feedback.filter((f) => f.status !== null).length
        const open = openId === t.id
        return (
          <div key={t.id} className={`rounded-xl border-2 bg-panel overflow-hidden ${overallBorder(t.feedback)}`}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : t.id)}
              className="w-full p-3.5 flex items-center justify-between gap-2 text-left"
            >
              <div className="min-w-0">
                <p className="text-xs text-gold font-medium">{TYPE_LABELS[t.type] ?? t.type}</p>
                <p className="text-sm font-medium text-ink truncate">{t.title}</p>
                {t.location && <p className="text-xs text-status-neutral">{t.location}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {t.feedback.length > 0 && (
                  <span className="text-xs text-status-neutral">{withFeedback}/{t.feedback.length} con feedback</span>
                )}
                <span className="text-status-neutral text-xs">{open ? '▲' : '▼'}</span>
              </div>
            </button>

            {open && (
              <div className="border-t border-outline p-3.5 space-y-3">
                {t.lines.length > 0 && (
                  <div>
                    <p className="text-xs text-status-neutral uppercase tracking-wide mb-1">Detalle del entrenamiento</p>
                    <ul className="text-sm text-ink space-y-0.5">
                      {t.lines.map((line, i) => (
                        <li key={i}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="text-xs text-status-neutral uppercase tracking-wide mb-1">Feedback por atleta</p>
                  <div className="space-y-2">
                    {t.feedback.map((f) => (
                      <div key={f.athleteMembershipId} className="flex items-start gap-2">
                        <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${statusDot(f.status)}`} />
                        <div className="min-w-0">
                          <p className="text-sm text-ink">
                            {f.athleteName}{' '}
                            <span className="text-xs text-status-neutral">
                              — {f.status ? STATUS_LABEL[f.status] : 'sin cargar todavía'}
                              {f.energia !== null && ` · energía ${f.energia}/10`}
                            </span>
                          </p>
                          {f.notes && <p className="text-xs text-status-neutral italic">"{f.notes}"</p>}
                        </div>
                      </div>
                    ))}
                    {t.feedback.length === 0 && <p className="text-xs text-status-neutral">Sin atletas asignados.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
