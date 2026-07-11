import type { Observation } from './types'

/** Umbral real de World Athletics: viento a favor mayor a esto invalida el récord. */
export const WIND_DISQUALIFICATION_THRESHOLD_MS = 2.0

export function isBetter(value: number, currentBest: number | null, higherIsBetter: boolean): boolean {
  if (currentBest === null) return true
  return higherIsBetter ? value > currentBest : value < currentBest
}

export function isWindDisqualifying(windSensitive: boolean, windValue: number | null | undefined): boolean {
  if (!windSensitive) return false
  if (windValue === null || windValue === undefined) return false // sin dato -> permisivo, no descalifica
  return windValue > WIND_DISQUALIFICATION_THRESHOLD_MS
}

export function recordTypeForSource(sourceType: string): 'oficial' | 'entrenamiento' {
  return sourceType === 'competencia' ? 'oficial' : 'entrenamiento'
}

/**
 * Encuentra la mejor Observation vigente entre candidatas, respetando
 * dirección y descalificación por viento — misma lógica que el trigger
 * de Postgres, en TypeScript puro para poder testearla aislada y para
 * que la recomputación de un récord tras una corrección (mutations.ts)
 * no dependa de reinsertar filas para forzar al trigger a correr.
 */
export function findBestObservation(
  candidates: Array<{ observation: Observation; windValue?: number | null }>,
  higherIsBetter: boolean,
  windSensitive: boolean
): Observation | null {
  let best: Observation | null = null
  let bestValue: number | null = null

  for (const { observation, windValue } of candidates) {
    if (observation.supersededBy !== null) continue
    if (observation.state !== 'ejecutado') continue
    if (isWindDisqualifying(windSensitive, windValue)) continue

    if (isBetter(observation.value, bestValue, higherIsBetter)) {
      best = observation
      bestValue = observation.value
    }
  }

  return best
}
