import { describe, test, expect } from 'vitest'
import { computeGroupAverage } from '@/domains/performance/queries'

describe('computeGroupAverage', () => {
  test('promedia correctamente cuando todos los atletas tienen dato en la misma fecha', () => {
    const series = [
      { athleteMembershipId: 'a', athleteName: 'A', points: [{ date: '2026-01-01', value: 100 }] },
      { athleteMembershipId: 'b', athleteName: 'B', points: [{ date: '2026-01-01', value: 120 }] },
    ]
    const result = computeGroupAverage(series)
    expect(result).toEqual([{ date: '2026-01-01', average: 110 }])
  })

  test('fechas donde solo un atleta tiene dato, promedia solo con ese', () => {
    const series = [
      { athleteMembershipId: 'a', athleteName: 'A', points: [{ date: '2026-01-01', value: 100 }, { date: '2026-01-05', value: 90 }] },
      { athleteMembershipId: 'b', athleteName: 'B', points: [{ date: '2026-01-01', value: 120 }] },
    ]
    const result = computeGroupAverage(series)
    const jan5 = result.find((r) => r.date === '2026-01-05')
    expect(jan5?.average).toBe(90)
  })

  test('resultado ordenado cronológicamente', () => {
    const series = [
      { athleteMembershipId: 'a', athleteName: 'A', points: [{ date: '2026-03-01', value: 1 }, { date: '2026-01-01', value: 2 }] },
    ]
    const result = computeGroupAverage(series)
    expect(result.map((r) => r.date)).toEqual(['2026-01-01', '2026-03-01'])
  })

  test('sin series, devuelve lista vacía', () => {
    expect(computeGroupAverage([])).toEqual([])
  })
})
