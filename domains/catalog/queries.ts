import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import type { Sport, Unit, Observable, ContextKey } from './types'

/**
 * Todas las queries de este archivo devuelven catálogo global + el propio
 * de la organización (RLS ya filtra eso), MENOS los ítems globales que la
 * organización ocultó explícitamente vía catalog_visibility_overrides.
 * El filtrado de "ocultos" se hace acá (no en RLS) porque es una
 * preferencia de UI, no una regla de seguridad — un manager que oculta
 * "3000m con obstáculos" para su club no está protegiendo ningún dato
 * sensible, solo simplificando lo que ve su equipo.
 */

async function getHiddenIds(
  supabase: AppSupabaseClient,
  organizationId: string,
  entityType: 'sport' | 'unit' | 'observable' | 'context_key'
): Promise<Set<string>> {
  const { data } = await supabase
    .from('catalog_visibility_overrides')
    .select('entity_id')
    .eq('organization_id', organizationId)
    .eq('entity_type', entityType)
    .eq('hidden', true)

  return new Set((data ?? []).map((row) => row.entity_id as string))
}

export async function getSports(organizationId: string, client?: AppSupabaseClient): Promise<Sport[]> {
  const supabase = client ?? (await createServerClient())
  const [{ data, error }, hidden] = await Promise.all([
    supabase.from('sports').select('id, organization_id, name').order('name'),
    getHiddenIds(supabase, organizationId, 'sport'),
  ])
  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? [])
    .filter((row) => !hidden.has(row.id))
    .map((row) => ({ id: row.id, organizationId: row.organization_id, name: row.name }))
}

export async function getUnits(organizationId: string, client?: AppSupabaseClient): Promise<Unit[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('units')
    .select('id, organization_id, name, symbol, category, base_unit_id, conversion_type, conversion_params')
    .order('name')
  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    symbol: row.symbol,
    category: row.category,
    baseUnitId: row.base_unit_id,
    conversionType: row.conversion_type,
    conversionParams: row.conversion_params,
  }))
}

export async function getObservables(
  organizationId: string,
  filters: { sportId?: string; isPerformance?: boolean } = {},
  client?: AppSupabaseClient
): Promise<Observable[]> {
  const supabase = client ?? (await createServerClient())

  let query = supabase
    .from('observables')
    .select(
      'id, organization_id, sport_id, unit_id, name, is_performance, muscle_group, equipment, description, tags, variant_of_id'
    )
    .order('name')

  if (filters.sportId) query = query.eq('sport_id', filters.sportId)
  if (filters.isPerformance !== undefined) query = query.eq('is_performance', filters.isPerformance)

  const [{ data, error }, hidden] = await Promise.all([
    query,
    getHiddenIds(supabase, organizationId, 'observable'),
  ])
  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? [])
    .filter((row) => !hidden.has(row.id))
    .map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      sportId: row.sport_id,
      unitId: row.unit_id,
      name: row.name,
      isPerformance: row.is_performance,
      muscleGroup: row.muscle_group,
      equipment: row.equipment,
      description: row.description,
      tags: row.tags ?? [],
      variantOfId: row.variant_of_id,
    }))
}

export async function getContextKeys(
  organizationId: string,
  sportId?: string,
  client?: AppSupabaseClient
): Promise<ContextKey[]> {
  const supabase = client ?? (await createServerClient())

  let query = supabase
    .from('context_keys')
    .select('id, organization_id, name, data_type, unit_id, valid_min, valid_max, applies_to_sport_id, required')
    .order('name')

  if (sportId) query = query.or(`applies_to_sport_id.eq.${sportId},applies_to_sport_id.is.null`)

  const { data, error } = await query
  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    dataType: row.data_type,
    unitId: row.unit_id,
    validMin: row.valid_min,
    validMax: row.valid_max,
    appliesToSportId: row.applies_to_sport_id,
    required: row.required,
  }))
}
