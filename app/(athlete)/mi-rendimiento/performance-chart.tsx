'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts'

interface ResultPoint {
  date: string
  observableName: string
  value: number
}

const COLORS = ['#0B1E3F', '#C6A55C', '#2E7D32', '#B45309', '#C62828', '#6D28D9', '#0E7490', '#9D174D']

export function MyPerformanceChart({ results }: { results: ResultPoint[] }) {
  const observableNames = useMemo(() => Array.from(new Set(results.map((r) => r.observableName))).sort(), [results])
  const [selected, setSelected] = useState<Set<string>>(new Set(observableNames.slice(0, 3)))

  const chartData = useMemo(() => {
    const dates = Array.from(new Set(results.filter((r) => selected.has(r.observableName)).map((r) => r.date))).sort()
    return dates.map((date) => {
      const row: { date: string; [key: string]: string | number } = { date }
      for (const r of results) {
        if (r.date === date && selected.has(r.observableName)) row[r.observableName] = r.value
      }
      return row
    })
  }, [results, selected])

  function toggle(name: string) {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setSelected(next)
  }

  if (observableNames.length === 0) {
    return <p className="text-sm text-status-neutral">Todavía no hay resultados para graficar.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {observableNames.map((name) => (
          <button
            key={name}
            onClick={() => toggle(name)}
            className={`text-xs rounded-full px-3 py-1 border ${
              selected.has(name) ? 'bg-navy text-white border-navy' : 'bg-white text-status-neutral border-gray-200'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {selected.size === 0 ? (
        <p className="text-sm text-status-neutral">Elegí al menos una prueba para ver el gráfico.</p>
      ) : chartData.length === 0 ? (
        <p className="text-sm text-status-neutral">Sin datos para lo elegido.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="date" fontSize={11} stroke="#94A3B8" />
            <YAxis fontSize={11} stroke="#94A3B8" />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {Array.from(selected).map((name, i) => (
              <Line key={name} type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
