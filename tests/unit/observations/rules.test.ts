import { describe, test, expect } from 'vitest'
import { isBetter, isWindDisqualifying, findBestObservation, recordTypeForSource } from '@/domains/observations/rules'
import type { Observation } from '@/domains/observations/types'

function obs(overrides: Partial<Observation>): Observation {
  return {
    id: 'o-1',
    organizationId: 'org-1',
    athleteMembershipId: 'ath-1',
    observableId: 'obl-1',
    value: 10,
    date: '2026-01-01',
    sourceType: 'entrenamiento',
    eventId: null,
    assessmentId: null,
    importId: null,
    validationStatus: 'no_verificado',
    state: 'ejecutado',
    fulfillsObservationId: null,
    supersededBy: null,
    notes: null,
    createdByMembershipId: 'm-1',
    ...overrides,
  }
}

describe('isBetter — dirección de la prueba', () => {
  test('sin récord previo, cualquier valor es mejor', () => {
    expect(isBetter(15.2, null, false)).toBe(true)
  })

  test('en tiempo (higherIsBetter=false), menos es mejor', () => {
    expect(isBetter(10.5, 11.0, false)).toBe(true)
    expect(isBetter(11.5, 11.0, false)).toBe(false)
  })

  test('en distancia/peso (higherIsBetter=true), más es mejor', () => {
    expect(isBetter(7.2, 6.8, true)).toBe(true)
    expect(isBetter(6.5, 6.8, true)).toBe(false)
  })

  test('un valor igual al actual no cuenta como mejor', () => {
    expect(isBetter(11.0, 11.0, false)).toBe(false)
  })
})

describe('isWindDisqualifying', () => {
  test('prueba no sensible al viento nunca descalifica, sin importar el valor', () => {
    expect(isWindDisqualifying(false, 5.0)).toBe(false)
  })

  test('viento exactamente en el límite (2.0) NO descalifica', () => {
    expect(isWindDisqualifying(true, 2.0)).toBe(false)
  })

  test('viento apenas por encima del límite sí descalifica', () => {
    expect(isWindDisqualifying(true, 2.1)).toBe(true)
  })

  test('sin dato de viento cargado, no descalifica (permisivo)', () => {
    expect(isWindDisqualifying(true, null)).toBe(false)
    expect(isWindDisqualifying(true, undefined)).toBe(false)
  })

  test('viento en contra (negativo) nunca descalifica', () => {
    expect(isWindDisqualifying(true, -3.0)).toBe(false)
  })
})

describe('recordTypeForSource', () => {
  test('competencia -> oficial', () => {
    expect(recordTypeForSource('competencia')).toBe('oficial')
  })

  test('cualquier otro origen -> entrenamiento', () => {
    expect(recordTypeForSource('entrenamiento')).toBe('entrenamiento')
    expect(recordTypeForSource('assessment')).toBe('entrenamiento')
    expect(recordTypeForSource('manual')).toBe('entrenamiento')
  })
})

describe('findBestObservation', () => {
  test('elige la mejor entre varias candidatas, en tiempo', () => {
    const candidates = [
      { observation: obs({ id: 'a', value: 11.2 }) },
      { observation: obs({ id: 'b', value: 10.8 }) },
      { observation: obs({ id: 'c', value: 11.5 }) },
    ]
    const best = findBestObservation(candidates, false, false)
    expect(best?.id).toBe('b')
  })

  test('descarta Observations no vigentes (superseded_by no nulo)', () => {
    const candidates = [
      { observation: obs({ id: 'a', value: 10.5, supersededBy: 'x' }) },
      { observation: obs({ id: 'b', value: 11.0 }) },
    ]
    const best = findBestObservation(candidates, false, false)
    expect(best?.id).toBe('b') // "a" sería mejor pero está corregida, no cuenta
  })

  test('descarta Observations en estado planificado, no ejecutado', () => {
    const candidates = [
      { observation: obs({ id: 'a', value: 9.0, state: 'planificado' }) },
      { observation: obs({ id: 'b', value: 11.0, state: 'ejecutado' }) },
    ]
    const best = findBestObservation(candidates, false, false)
    expect(best?.id).toBe('b')
  })

  test('descarta la más rápida si tiene viento excesivo, elige la siguiente mejor válida', () => {
    const candidates = [
      { observation: obs({ id: 'rapida-viento', value: 10.2 }), windValue: 3.5 },
      { observation: obs({ id: 'valida', value: 10.9 }), windValue: 1.5 },
    ]
    const best = findBestObservation(candidates, false, true)
    expect(best?.id).toBe('valida')
  })

  test('sin candidatas elegibles, no hay récord', () => {
    const candidates = [{ observation: obs({ id: 'a', value: 10.0, supersededBy: 'x' }) }]
    const best = findBestObservation(candidates, false, false)
    expect(best).toBeNull()
  })
})
