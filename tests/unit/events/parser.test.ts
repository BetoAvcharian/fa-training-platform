import { describe, test, expect } from 'vitest'
import { parseLine } from '@/domains/events/rules'

describe('SmartLine — Fuerza', () => {
  test('interpreta "Sentadilla 4x8x120kg" completo', () => {
    const result = parseLine('Sentadilla 4x8x120kg', 'Fuerza')
    expect(result.isStructured).toBe(true)
    expect(result.observableName).toBe('Sentadilla')
    expect(result.sets).toBe(4)
    expect(result.reps).toBe(8)
    expect(result.weightKg).toBe(120)
  })

  test('sin unidad explícita asume kg', () => {
    const result = parseLine('Peso muerto 3x5x140', 'Fuerza')
    expect(result.isStructured).toBe(true)
    expect(result.weightKg).toBe(140)
  })

  test('con unidad lb convierte a kg (unidad base)', () => {
    const result = parseLine('Press banca 4x8x100lb', 'Fuerza')
    expect(result.isStructured).toBe(true)
    expect(result.weightKg).toBeCloseTo(45.36, 1)
  })

  test('nombre de ejercicio con espacios se interpreta bien', () => {
    const result = parseLine('Sentadilla búlgara 3x10x20kg', 'Fuerza')
    expect(result.observableName).toBe('Sentadilla búlgara')
  })

  test('texto sin patrón reconocible NO bloquea — se guarda sin estructurar', () => {
    const result = parseLine('trabajo de técnica libre, sin números', 'Fuerza')
    expect(result.isStructured).toBe(false)
    expect(result.raw).toBe('trabajo de técnica libre, sin números')
  })

  test('línea vacía no rompe, queda sin estructurar', () => {
    const result = parseLine('   ', 'Fuerza')
    expect(result.isStructured).toBe(false)
  })
})

describe('SmartLine — Atletismo', () => {
  test('interpreta "4x400m 1:15 r2\'" completo', () => {
    const result = parseLine("4x400m 1:15 r2'", 'Atletismo')
    expect(result.isStructured).toBe(true)
    expect(result.observableName).toBe('400m')
    expect(result.sets).toBe(4)
    expect(result.distanceMeters).toBe(400)
    expect(result.timeSeconds).toBe(75)
    expect(result.restSeconds).toBe(120)
  })

  test('sin repeticiones al inicio asume una sola vez', () => {
    const result = parseLine('400m 1:15', 'Atletismo')
    expect(result.isStructured).toBe(true)
    expect(result.sets).toBe(1)
  })

  test('sin descanso explícito queda undefined, no bloquea', () => {
    const result = parseLine('2x200m 0:32', 'Atletismo')
    expect(result.isStructured).toBe(true)
    expect(result.restSeconds).toBeUndefined()
  })

  test('tiempo con formato HH:MM:SS se interpreta bien', () => {
    const result = parseLine('1x3000m 12:30', 'Atletismo')
    expect(result.timeSeconds).toBe(12 * 60 + 30)
  })

  test('una línea de fuerza interpretada como atletismo no rompe, degrada', () => {
    const result = parseLine('Sentadilla 4x8x120kg', 'Atletismo')
    expect(result.isStructured).toBe(false)
  })
})
