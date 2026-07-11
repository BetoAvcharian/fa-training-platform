import { describe, test, expect } from 'vitest'
import { convertToBaseUnit, convertFromBaseUnit } from '@/domains/catalog/rules'
import type { Unit } from '@/domains/catalog/types'

const kg: Unit = {
  id: '1',
  organizationId: null,
  name: 'Kilogramo',
  symbol: 'kg',
  category: 'masa',
  baseUnitId: '1',
  conversionType: 'lineal',
  conversionParams: { factor: 1 },
}

const lb: Unit = {
  id: '2',
  organizationId: null,
  name: 'Libra',
  symbol: 'lb',
  category: 'masa',
  baseUnitId: '1',
  conversionType: 'lineal',
  conversionParams: { factor: 0.45359237 },
}

const fahrenheit: Unit = {
  id: '3',
  organizationId: null,
  name: 'Fahrenheit',
  symbol: '°F',
  category: 'temperatura',
  baseUnitId: '4',
  conversionType: 'formula',
  conversionParams: { formula: 'fahrenheit_to_celsius' },
}

describe('Conversión de unidades — lineal', () => {
  test('convertir a la unidad base con factor 1 no cambia el valor', () => {
    expect(convertToBaseUnit(120, kg)).toBe(120)
  })

  test('120 lb se convierte correctamente a kg (base)', () => {
    expect(convertToBaseUnit(120, lb)).toBeCloseTo(54.43, 1)
  })

  test('ida y vuelta (kg -> lb -> kg) no pierde precisión relevante', () => {
    const base = convertToBaseUnit(100, lb)
    const back = convertFromBaseUnit(base, lb)
    expect(back).toBeCloseTo(100, 6)
  })
})

describe('Conversión de unidades — fórmula (no lineal)', () => {
  test('212°F se convierte a 100°C (punto de ebullición del agua)', () => {
    expect(convertToBaseUnit(212, fahrenheit)).toBeCloseTo(100, 6)
  })

  test('32°F se convierte a 0°C (punto de congelamiento)', () => {
    expect(convertToBaseUnit(32, fahrenheit)).toBeCloseTo(0, 6)
  })

  test('0°C convertido de vuelta a Fahrenheit da 32°F', () => {
    expect(convertFromBaseUnit(0, fahrenheit)).toBeCloseTo(32, 6)
  })

  test('una fórmula no registrada lanza DomainError en vez de fallar en silencio', () => {
    const unidadInventada: Unit = {
      ...fahrenheit,
      conversionParams: { formula: 'formula_que_no_existe' },
    }
    expect(() => convertToBaseUnit(100, unidadInventada)).toThrow(/Fórmula de conversión desconocida/)
  })
})
