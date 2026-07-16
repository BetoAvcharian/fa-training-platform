import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getTodayISO } from '@/lib/today'
import { SYMPTOM_OPTIONS, type CycleFlow, type CycleDayLog, type CycleStats } from './cycle-types'

export { SYMPTOM_OPTIONS, type CycleFlow, type CycleDayLog, type CycleStats }

/** Todos los días cargados para un atleta, en un rango de fechas (para pintar el calendario). */
export async function getCycleLogs(
  athleteMembershipId: string,
  fromDate: string,
  toDate: string,
  client?: AppSupabaseClient
): Promise<CycleDayLog[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('menstrual_cycle_logs')
    .select('id, date, flow, symptoms, notes')
    .eq('athlete_membership_id', athleteMembershipId)
    .gte('date', fromDate)
    .lte('date', toDate)
    .order('date')

  if (error) throw new DomainError('NOT_FOUND', error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    date: row.date,
    flow: row.flow,
    symptoms: row.symptoms ?? [],
    notes: row.notes,
  }))
}

/** Todos los días con sangrado cargados (para calcular estadísticas), sin límite de rango. */
async function getAllFlowDates(athleteMembershipId: string, supabase: AppSupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('menstrual_cycle_logs')
    .select('date')
    .eq('athlete_membership_id', athleteMembershipId)
    .not('flow', 'is', null)
    .order('date')

  if (error) throw new DomainError('NOT_FOUND', error.message)
  return (data ?? []).map((r) => r.date)
}

/**
 * Agrupa fechas con sangrado en "períodos" (una racha con huecos de
 * hasta 1 día sigue siendo el mismo período), y con eso calcula el día
 * actual del ciclo y una predicción simple del próximo período
 * (promedio de duración entre el inicio de cada período).
 */
export async function getCycleStats(athleteMembershipId: string, client?: AppSupabaseClient): Promise<CycleStats> {
  const supabase = client ?? (await createServerClient())
  const dates = await getAllFlowDates(athleteMembershipId, supabase)

  if (dates.length === 0) {
    return { currentCycleDay: null, averageCycleLength: null, lastPeriodStart: null, predictedNextPeriod: null }
  }

  const periodStarts: string[] = [dates[0]]
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + 'T00:00:00')
    const curr = new Date(dates[i] + 'T00:00:00')
    const gapDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    if (gapDays > 3) periodStarts.push(dates[i]) // más de 3 días sin sangrado = período nuevo
  }

  const lastPeriodStart = periodStarts[periodStarts.length - 1]

  let averageCycleLength: number | null = null
  if (periodStarts.length >= 2) {
    const gaps: number[] = []
    for (let i = 1; i < periodStarts.length; i++) {
      const a = new Date(periodStarts[i - 1] + 'T00:00:00')
      const b = new Date(periodStarts[i] + 'T00:00:00')
      gaps.push(Math.round((b.getTime() - a.getTime()) / 86400000))
    }
    averageCycleLength = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length)
  }

  const today = getTodayISO()
  const todayDate = new Date(today + 'T00:00:00')
  const lastStartDate = new Date(lastPeriodStart + 'T00:00:00')
  const currentCycleDay = Math.round((todayDate.getTime() - lastStartDate.getTime()) / 86400000) + 1

  let predictedNextPeriod: string | null = null
  if (averageCycleLength) {
    const predicted = new Date(lastStartDate.getTime() + averageCycleLength * 86400000)
    predictedNextPeriod = predicted.toISOString().slice(0, 10)
  }

  return { currentCycleDay, averageCycleLength, lastPeriodStart, predictedNextPeriod }
}

export async function logCycleDay(
  input: { athleteMembershipId: string; organizationId: string; date: string; flow?: CycleFlow | null; symptoms?: string[]; notes?: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor) throw new DomainError('PERMISSION', 'No autenticado')
  if (actor.id !== input.athleteMembershipId) throw new DomainError('PERMISSION', 'Solo podés cargar tu propio ciclo')

  const { error } = await supabase.from('menstrual_cycle_logs').upsert(
    {
      athlete_membership_id: input.athleteMembershipId,
      date: input.date,
      flow: input.flow ?? null,
      symptoms: input.symptoms ?? [],
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'athlete_membership_id,date' }
  )

  if (error) throw new DomainError('CONFLICT', error.message)
}

export async function deleteCycleDay(logId: string, client?: AppSupabaseClient): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const { error } = await supabase.from('menstrual_cycle_logs').delete().eq('id', logId)
  if (error) throw new DomainError('CONFLICT', error.message)
}
