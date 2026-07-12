import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { requireRole } from '@/domains/athletes/rules'
import { logAudit } from '@/domains/audit/mutations'
import type { CreateVideoInput } from './types'

export async function createVideo(input: CreateVideoInput, client?: AppSupabaseClient): Promise<{ id: string }> {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  const { data, error } = await supabase
    .from('videos')
    .insert({
      organization_id: input.organizationId,
      title: input.title,
      description: input.description ?? null,
      source_type: input.sourceType,
      url: input.url,
      created_by_membership_id: actor.id,
    })
    .select('id')
    .single()

  if (error || !data) throw new DomainError('CONFLICT', error?.message ?? 'No se pudo guardar el video')

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'video.create',
    entityType: 'video',
    entityId: data.id,
    metadata: { title: input.title, sourceType: input.sourceType },
  })

  return { id: data.id }
}

export async function deleteVideo(
  input: { id: string; organizationId: string; storagePath?: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const actor = await requireRole(input.organizationId, ['manager', 'coach'], supabase)

  const { error } = await supabase.from('videos').delete().eq('id', input.id)
  if (error) throw new DomainError('CONFLICT', error.message)

  if (input.storagePath) {
    await supabase.storage.from('videos').remove([input.storagePath])
  }

  await logAudit({
    organizationId: input.organizationId,
    actorMembershipId: actor.id,
    action: 'video.delete',
    entityType: 'video',
    entityId: input.id,
  })
}
