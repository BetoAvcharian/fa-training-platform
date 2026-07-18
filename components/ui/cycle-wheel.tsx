'use client'

const PHASES = [
  { key: 'menstruacion', label: 'Menstruación', color: '#C62828' },
  { key: 'proliferativa', label: 'Fase proliferativa', color: '#8D6E63' },
  { key: 'ovulacion', label: 'Ovulación', color: '#2E7D32' },
  { key: 'secretora', label: 'Fase secretora', color: '#C6A55C' },
] as const

function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arcPath(cx: number, cy: number, rOuter: number, rInner: number, startAngle: number, endAngle: number) {
  const startOuter = polarToXY(cx, cy, rOuter, startAngle)
  const endOuter = polarToXY(cx, cy, rOuter, endAngle)
  const startInner = polarToXY(cx, cy, rInner, endAngle)
  const endInner = polarToXY(cx, cy, rInner, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    'Z',
  ].join(' ')
}

/**
 * Rueda circular del ciclo, estilo Clue — 4 fases coloreadas alrededor
 * de un círculo de 28 días (o la duración promedio real si se sabe),
 * con el día actual marcado. Es una aproximación visual con
 * proporciones típicas, no un diagnóstico médico.
 */
export function CycleWheel({
  cycleLength = 28,
  currentDay,
  flowDays,
}: {
  cycleLength?: number
  currentDay: number | null
  flowDays: Set<number>
}) {
  const len = cycleLength || 28
  // Proporciones típicas escaladas a la duración real del ciclo
  const menstruacionEnd = Math.max(3, Math.round(len * 0.18))
  const ovulacionStart = Math.round(len * 0.46)
  const ovulacionEnd = Math.round(len * 0.57)

  const phaseRanges: Record<(typeof PHASES)[number]['key'], [number, number]> = {
    menstruacion: [1, menstruacionEnd],
    proliferativa: [menstruacionEnd + 1, ovulacionStart - 1],
    ovulacion: [ovulacionStart, ovulacionEnd],
    secretora: [ovulacionEnd + 1, len],
  }

  const size = 280
  const cx = size / 2
  const cy = size / 2
  const rOuter = 120
  const rInner = 78
  const anglePerDay = 360 / len

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px]">
        {PHASES.map((phase) => {
          const [start, end] = phaseRanges[phase.key]
          const startAngle = (start - 1) * anglePerDay
          const endAngle = end * anglePerDay
          return <path key={phase.key} d={arcPath(cx, cy, rOuter, rInner, startAngle, endAngle)} fill={phase.color} opacity={0.85} />
        })}

        {Array.from({ length: len }, (_, i) => i + 1).map((day) => {
          const angle = (day - 0.5) * anglePerDay
          const pos = polarToXY(cx, cy, (rOuter + rInner) / 2, angle)
          const isCurrent = day === currentDay
          const hasFlow = flowDays.has(day)
          return (
            <text
              key={day}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className={isCurrent ? 'fill-white font-bold' : 'fill-white/80'}
              style={{ fontSize: isCurrent ? 11 : 8 }}
            >
              {hasFlow ? '•' : day}
            </text>
          )
        })}

        {currentDay && (
          <circle
            {...polarToXY(cx, cy, rOuter + 10, (currentDay - 0.5) * anglePerDay)}
            r={5}
            className="fill-navy stroke-white"
            strokeWidth={2}
          />
        )}

        <circle cx={cx} cy={cy} r={rInner - 4} className="fill-panel" />
        <text x={cx} y={cy - 6} textAnchor="middle" className="fill-ink font-display font-bold" style={{ fontSize: 22 }}>
          {currentDay ?? '—'}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-status-neutral" style={{ fontSize: 10 }}>
          día del ciclo
        </text>
      </svg>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
        {PHASES.map((phase) => (
          <span key={phase.key} className="flex items-center gap-1 text-[10px] text-status-neutral">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: phase.color }} />
            {phase.label}
          </span>
        ))}
      </div>
    </div>
  )
}
