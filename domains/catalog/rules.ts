import { DomainError } from '@/types/errors'
import type { Unit } from './types'

/**
 * Registro cerrado de conversiones no lineales. A propósito NO se evalúan
 * expresiones arbitrarias almacenadas en la base (riesgo de seguridad +
 * imposible de tipar/testear) — cada fórmula es código real, registrada
 * acá por nombre. `conversion_params.formula` en la tabla `units` solo
 * puede referenciar una clave de este objeto; si no existe, se rechaza
 * explícitamente en vez de fallar en silencio.
 *
 * Agregar una unidad con fórmula nueva (ej: otra escala de temperatura)
 * requiere agregar una entrada acá — es la única parte del catálogo que
 * NO es pura configuración por datos (2.13), y es una excepción
 * consciente: una fórmula es lógica, no un dato.
 */
const FORMULA_CONVERTERS: Record<string, { toBase: (v: number) => number; fromBase: (v: number) => number }> = {
  fahrenheit_to_celsius: {
    toBase: (fahrenheit) => ((fahrenheit - 32) * 5) / 9,
    fromBase: (celsius) => (celsius * 9) / 5 + 32,
  },
}

/** Convierte un valor expresado en `unit` a la unidad base de su categoría. */
export function convertToBaseUnit(value: number, unit: Unit): number {
  if (unit.conversionType === 'lineal') {
    const factor = unit.conversionParams.factor
    if (typeof factor !== 'number') {
      throw new DomainError('VALIDATION', `Unit ${unit.name} no tiene un factor de conversión válido`)
    }
    return value * factor
  }

  const formulaName = unit.conversionParams.formula
  if (typeof formulaName !== 'string' || !FORMULA_CONVERTERS[formulaName]) {
    throw new DomainError('VALIDATION', `Fórmula de conversión desconocida: ${String(formulaName)}`)
  }
  return FORMULA_CONVERTERS[formulaName].toBase(value)
}

/** Convierte un valor en la unidad base de la categoría hacia `unit` (para mostrar). */
export function convertFromBaseUnit(baseValue: number, unit: Unit): number {
  if (unit.conversionType === 'lineal') {
    const factor = unit.conversionParams.factor
    if (typeof factor !== 'number') {
      throw new DomainError('VALIDATION', `Unit ${unit.name} no tiene un factor de conversión válido`)
    }
    return baseValue / factor
  }

  const formulaName = unit.conversionParams.formula
  if (typeof formulaName !== 'string' || !FORMULA_CONVERTERS[formulaName]) {
    throw new DomainError('VALIDATION', `Fórmula de conversión desconocida: ${String(formulaName)}`)
  }
  return FORMULA_CONVERTERS[formulaName].fromBase(baseValue)
}
