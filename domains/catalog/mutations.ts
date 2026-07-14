import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from '@/domains/athletes/rules'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { logAudit } from '@/domains/audit/mutations'
import type { CreateObservableInput, HideGlobalItemInput } from './types'

/**
 * Crea un Observable PROPIO de la organización — nunca global (el
 * `organizationId` viene del input pero requireRole ya garantiza que sea
 * la organización real del actor; la fila se inserta siempre con ese
 * valor, jamás null). El catálogo global es inmutable para cualquier rol
 * de aplicación, tal como quedó definido en 005_catalog_rls.sql.
 */
export async function createObservable(input: CreateObservableInput, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor || actor.organizationId !== input.organizationId) {
    throw new DomainError('PERMISSION', 'No autenticado')
  }

  const { data, error } = await supabase
    .from('observables')
    .insert({
      organization_id: input.organizationId,
      sport_id: input.sportId,
      unit_id: input.unitId,
      name: input.name,
      is_performance: input.isPerformance,
      muscle_group: input.muscleGroup ?? null,
      equipment: input.equipment ?? null,
      description: input.description ?? null,
      tags: input.tags ?? [],
      variant_of_id: input.variantOfId ?? null,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new DomainError('CONFLICT', error?.message ?? 'No se pudo crear el Observable')
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'catalog.observable_create',
    entityType: 'observable',
    entityId: data.id,
    metadata: { name: input.name, sportId: input.sportId },
  })

  return data
}

/** Edita un Observable PROPIO de la organización (nunca uno global). */
export async function updateObservable(
  input: { id: string; organizationId: string; name?: string; unitId?: string; isPerformance?: boolean },
  client?: AppSupabaseClient
) {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.unitId !== undefined) patch.unit_id = input.unitId
  if (input.isPerformance !== undefined) patch.is_performance = input.isPerformance

  const { error } = await supabase
    .from('observables')
    .update(patch)
    .eq('id', input.id)
    .eq('organization_id', input.organizationId)

  if (error) throw new DomainError('CONFLICT', error.message)

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'catalog.observable_create',
    entityType: 'observable',
    entityId: input.id,
    metadata: patch,
  })
}

/** Vuelve a mostrar un ítem global que se había ocultado. Exclusivo de manager. */
export async function unhideGlobalItem(input: HideGlobalItemInput, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager'], supabase)

  const { error } = await supabase
    .from('catalog_visibility_overrides')
    .delete()
    .eq('organization_id', input.organizationId)
    .eq('entity_type', input.entityType)
    .eq('entity_id', input.entityId)

  if (error) throw new DomainError('CONFLICT', error.message)

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'catalog.item_hidden',
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: { hidden: false },
  })
}


export async function hideGlobalItem(input: HideGlobalItemInput, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager'], supabase)

  const { error } = await supabase.rpc('hide_catalog_item', {
    p_organization_id: input.organizationId,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId,
  })

  if (error) {
    throw new DomainError('CONFLICT', error.message)
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'catalog.item_hidden',
    entityType: input.entityType,
    entityId: input.entityId,
  })
}
