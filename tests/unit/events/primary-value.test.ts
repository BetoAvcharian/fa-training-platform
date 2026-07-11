import { describe, test, expect } from 'vitest'
import { getPrimaryValue } from '@/domains/events/rules'

describe('getPrimaryValue — qué campo se usa como el valor de la Observation', () => {
  test('con peso cargado (fuerza), prioriza el peso', () => {
    const value = getPrimaryValue({ weightKg: 120, timeSeconds: null, distanceMeters: null })
    expect(value).toBe(120)
  })

  test('con tiempo y distancia (atletismo), prioriza el tiempo', () => {
    const value = getPrimaryValue({ weightKg: null, timeSeconds: 75, distanceMeters: 400 })
    expect(value).toBe(75)
  })

  test('solo distancia (salto/lanzamiento), usa la distancia', () => {
    const value = getPrimaryValue({ weightKg: null, timeSeconds: null, distanceMeters: 7.2 })
    expect(value).toBe(7.2)
  })

  test('línea sin ningún campo numérico, devuelve null (línea sin estructurar)', () => {
    const value = getPrimaryValue({ weightKg: null, timeSeconds: null, distanceMeters: null })
    expect(value).toBeNull()
  })

  test('peso en 0 es un valor válido, no se confunde con "no cargado"', () => {
    const value = getPrimaryValue({ weightKg: 0, timeSeconds: null, distanceMeters: null })
    expect(value).toBe(0)
  })
})
