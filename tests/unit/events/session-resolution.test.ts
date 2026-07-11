import { describe, test, expect } from 'vitest'
import { resolveSessionForAssignment } from '@/domains/events/rules'
import type { SessionExercise } from '@/domains/events/types'

function line(overrides: Partial<SessionExercise>): SessionExercise {
  return {
    id: 'line-x',
    eventId: 'event-1',
    sessionBlockId: null,
    orderIndex: 0,
    rawText: '',
    isStructured: false,
    observableId: null,
    sets: null,
    reps: null,
    weightKg: null,
    distanceMeters: null,
    timeSeconds: null,
    restSeconds: null,
    replacesId: null,
    ...overrides,
  }
}

describe('resolveSessionForAssignment — excepciones sin duplicar la sesión', () => {
  test('sin ninguna excepción, todos ven las mismas líneas genéricas', () => {
    const lines = [
      line({ id: 'a', orderIndex: 0, rawText: '4x400m' }),
      line({ id: 'b', orderIndex: 1, rawText: 'Sentadilla' }),
    ]
    const exceptionMap = new Map<string, string[]>()

    const forAthlete1 = resolveSessionForAssignment(lines, exceptionMap, 'assign-1')
    const forAthlete2 = resolveSessionForAssignment(lines, exceptionMap, 'assign-2')

    expect(forAthlete1.map((l) => l.id)).toEqual(['a', 'b'])
    expect(forAthlete2.map((l) => l.id)).toEqual(['a', 'b'])
  })

  test('un atleta con excepción ve la línea propia en vez de la genérica que reemplaza', () => {
    const generic = line({ id: 'generic-400', orderIndex: 0, rawText: '4x400m' })
    const exception = line({ id: 'exc-200', orderIndex: 0, rawText: '6x200m', replacesId: 'generic-400' })
    const lines = [generic, exception]

    const exceptionMap = new Map<string, string[]>([['exc-200', ['assign-lesionado']]])

    const forLesionado = resolveSessionForAssignment(lines, exceptionMap, 'assign-lesionado')
    const forResto = resolveSessionForAssignment(lines, exceptionMap, 'assign-normal')

    expect(forLesionado.map((l) => l.id)).toEqual(['exc-200'])
    expect(forResto.map((l) => l.id)).toEqual(['generic-400'])
  })

  test('una excepción compartida por varios assignments (no solo uno) se ve igual para todos ellos', () => {
    const generic = line({ id: 'generic', orderIndex: 0, rawText: '4x400m' })
    const exception = line({ id: 'exc', orderIndex: 0, rawText: '6x200m', replacesId: 'generic' })
    const lines = [generic, exception]

    // La MISMA línea de excepción vale para dos atletas distintos —
    // exactamente el caso "varios lesionados con la misma variante" que
    // motivó SessionExerciseAssignment en vez de un campo único.
    const exceptionMap = new Map<string, string[]>([['exc', ['assign-1', 'assign-2']]])

    const forAtleta1 = resolveSessionForAssignment(lines, exceptionMap, 'assign-1')
    const forAtleta2 = resolveSessionForAssignment(lines, exceptionMap, 'assign-2')
    const forAtleta3 = resolveSessionForAssignment(lines, exceptionMap, 'assign-3')

    expect(forAtleta1.map((l) => l.id)).toEqual(['exc'])
    expect(forAtleta2.map((l) => l.id)).toEqual(['exc'])
    expect(forAtleta3.map((l) => l.id)).toEqual(['generic'])
  })

  test('líneas genéricas que NO fueron reemplazadas se mantienen para el atleta con excepción', () => {
    const genericA = line({ id: 'a', orderIndex: 0, rawText: '4x400m' })
    const genericB = line({ id: 'b', orderIndex: 1, rawText: 'Sentadilla' })
    const exception = line({ id: 'exc', orderIndex: 0, rawText: '6x200m', replacesId: 'a' })
    const lines = [genericA, genericB, exception]

    const exceptionMap = new Map<string, string[]>([['exc', ['assign-1']]])
    const forAtleta1 = resolveSessionForAssignment(lines, exceptionMap, 'assign-1')

    // reemplaza SOLO "a" (400m) — "b" (Sentadilla) sigue estando
    expect(forAtleta1.map((l) => l.id).sort()).toEqual(['b', 'exc'])
  })
})
