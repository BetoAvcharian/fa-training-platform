import type { ParsedLine, SessionExercise } from './types'

/**
 * Interpreta una línea de carga en texto natural, según el patrón de
 * notación del deporte (Fase 4). NUNCA lanza excepción ni bloquea — si no
 * logra interpretar con confianza, devuelve `isStructured: false` y
 * conserva el texto tal cual, para que se guarde igual (2.19: nunca
 * bloquear la carga) y se complete después.
 *
 * El patrón de lectura es específico por deporte, no genérico — agregar
 * un deporte nuevo significa agregar un caso acá, no reescribir el
 * parser entero (2.9: extensible sin reescritura).
 */
export function parseLine(rawText: string, sportName: 'Fuerza' | 'Atletismo'): ParsedLine {
  const raw = rawText.trim()
  if (!raw) {
    return { raw, isStructured: false }
  }

  if (sportName === 'Fuerza') {
    return parseFuerzaLine(raw)
  }
  return parseAtletismoLine(raw)
}

/**
 * "Sentadilla 4x8x120kg" -> ejercicio + series x reps x carga
 * También acepta sin unidad ("...120") asumiendo kg, y "lb" explícito.
 */
function parseFuerzaLine(raw: string): ParsedLine {
  const match = raw.match(/^(.+?)\s+(\d+)\s*x\s*(\d+)\s*x\s*(\d+(?:[.,]\d+)?)\s*(kg|lb)?$/i)
  if (!match) {
    return { raw, isStructured: false }
  }

  const [, name, sets, reps, weightRaw, unit] = match
  let weightKg = parseFloat(weightRaw.replace(',', '.'))
  if (unit?.toLowerCase() === 'lb') {
    weightKg = weightKg * 0.45359237
  }

  return {
    raw,
    isStructured: true,
    observableName: name.trim(),
    sets: parseInt(sets, 10),
    reps: parseInt(reps, 10),
    weightKg,
  }
}

/**
 * "4x400m 1:15 r2'" -> repeticiones x distancia, tiempo objetivo, descanso
 * También acepta una sola repetición sin el "1x" inicial: "400m 1:15".
 */
function parseAtletismoLine(raw: string): ParsedLine {
  const match = raw.match(
    /^(?:(\d+)\s*x\s*)?(\d+)\s*m\s+(\d+:\d+(?:[.,]\d+)?)\s*(?:r\s*(\d+)['’]?)?$/i
  )
  if (!match) {
    return { raw, isStructured: false }
  }

  const [, repsRaw, distanceRaw, timeRaw, restRaw] = match
  const reps = repsRaw ? parseInt(repsRaw, 10) : 1
  const distanceMeters = parseInt(distanceRaw, 10)
  const timeSeconds = parseTimeToSeconds(timeRaw)
  const restSeconds = restRaw ? parseInt(restRaw, 10) * 60 : undefined

  if (timeSeconds === null) {
    return { raw, isStructured: false }
  }

  return {
    raw,
    isStructured: true,
    observableName: `${distanceMeters}m`,
    sets: reps,
    distanceMeters,
    timeSeconds,
    restSeconds,
  }
}

function parseTimeToSeconds(raw: string): number | null {
  const parts = raw.replace(',', '.').split(':').map(Number)
  if (parts.some((p) => isNaN(p))) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

/**
 * Resuelve qué líneas ve un EventAssignment puntual dentro de una sesión:
 * todas las líneas genéricas (sin excepción registrada), MENOS las que
 * fueron reemplazadas por una línea propia de ese assignment, MÁS las
 * líneas de excepción que sí le corresponden.
 *
 * Recibe `exceptionMap`: para cada línea de excepción, la lista de
 * event_assignment_id a los que aplica (viene de SessionExerciseAssignment).
 */
export function resolveSessionForAssignment(
  allLines: SessionExercise[],
  exceptionMap: Map<string, string[]>, // sessionExerciseId -> assignmentIds
  assignmentId: string
): SessionExercise[] {
  const genericLines = allLines.filter((line) => !exceptionMap.has(line.id))
  const myExceptionLines = allLines.filter((line) => exceptionMap.get(line.id)?.includes(assignmentId))

  const replacedIds = new Set(myExceptionLines.map((line) => line.replacesId).filter(Boolean))

  const remainingGeneric = genericLines.filter((line) => !replacedIds.has(line.id))

  return [...remainingGeneric, ...myExceptionLines].sort((a, b) => a.orderIndex - b.orderIndex)
}

/**
 * Una SessionExercise puede tener varios campos numéricos poblados
 * (sets/reps + peso, o distancia + tiempo). Para generar la Observation
 * "planificada" correspondiente hace falta UN solo valor — se prioriza
 * el que corresponde a la unidad del Observable vinculado: peso para
 * fuerza, tiempo para pruebas de pista cronometradas, distancia si no
 * hay tiempo (saltos/lanzamientos).
 */
export function getPrimaryValue(line: {
  weightKg: number | null
  timeSeconds: number | null
  distanceMeters: number | null
}): number | null {
  if (line.weightKg !== null) return line.weightKg
  if (line.timeSeconds !== null) return line.timeSeconds
  if (line.distanceMeters !== null) return line.distanceMeters
  return null
}
