export type CycleFlow = 'ligero' | 'medio' | 'abundante' | 'manchado'

export interface CycleDayLog {
  id: string
  date: string
  flow: CycleFlow | null
  symptoms: string[]
  notes: string | null
}

export const SYMPTOM_OPTIONS = [
  'cólicos',
  'dolor de cabeza',
  'hinchazón',
  'cansancio',
  'irritabilidad',
  'antojos',
  'acné',
  'dolor de espalda',
] as const

export interface CycleStats {
  currentCycleDay: number | null
  averageCycleLength: number | null
  lastPeriodStart: string | null
  predictedNextPeriod: string | null
}
