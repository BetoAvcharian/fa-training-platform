import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import type { Video } from './types'

export async function getVideos(organizationId: string, client?: AppSupabaseClient): Promise<Video[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('videos')
    .select('id, organization_id, title, description, source_type, url, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    sourceType: row.source_type as Video['sourceType'],
    url: row.url,
    createdAt: row.created_at,
  }))
}
