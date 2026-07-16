import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'

export interface TaggedAthlete {
  id: string
  name: string
}

/**
 * `viewerCoachMembershipId`: si se pasa, oculta cualquier atleta
 * etiquetado que no sea del equipo de ese coach — un coach nunca debe
 * ver el nombre de un atleta ajeno, ni siquiera en un video que sí le
 * es visible por tener también a uno de los suyos etiquetado.
 */
export async function getAthletesForVideo(
  videoId: string,
  viewerCoachMembershipId?: string,
  client?: AppSupabaseClient
): Promise<TaggedAthlete[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('video_athlete_tags')
    .select('athlete_membership_id, memberships(coach_membership_id, people(first_name, last_name))')
    .eq('video_id', videoId)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? [])
    .filter((row: any) => !viewerCoachMembershipId || row.memberships?.coach_membership_id === viewerCoachMembershipId)
    .map((row: any) => ({
      id: row.athlete_membership_id,
      name: row.memberships?.people ? `${row.memberships.people.first_name} ${row.memberships.people.last_name}` : '—',
    }))
}

export async function tagAthletesOnVideo(
  input: { videoId: string; athleteMembershipIds: string[]; organizationId: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor || actor.organizationId !== input.organizationId) throw new DomainError('PERMISSION', 'No autenticado')

  if (input.athleteMembershipIds.length === 0) return

  const { error } = await supabase
    .from('video_athlete_tags')
    .insert(input.athleteMembershipIds.map((athleteMembershipId) => ({ video_id: input.videoId, athlete_membership_id: athleteMembershipId })))

  if (error) throw new DomainError('CONFLICT', error.message)
}

export async function untagAthlete(
  input: { videoId: string; athleteMembershipId: string; organizationId: string },
  client?: AppSupabaseClient
): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const actor = await getMyActiveMembership(supabase)
  if (!actor || actor.organizationId !== input.organizationId) throw new DomainError('PERMISSION', 'No autenticado')

  const { error } = await supabase
    .from('video_athlete_tags')
    .delete()
    .eq('video_id', input.videoId)
    .eq('athlete_membership_id', input.athleteMembershipId)

  if (error) throw new DomainError('CONFLICT', error.message)
}

/** Videos donde este atleta puntual fue etiquetado — para su pestaña de Videos. */
export async function getVideosForAthlete(athleteMembershipId: string, client?: AppSupabaseClient) {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('video_athlete_tags')
    .select('videos(id, title, description, source_type, category, url, created_at)')
    .eq('athlete_membership_id', athleteMembershipId)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? [])
    .map((row: any) => row.videos)
    .filter(Boolean)
    .map((v: any) => ({
      id: v.id,
      title: v.title,
      description: v.description,
      sourceType: v.source_type,
      category: v.category,
      url: v.url,
      createdAt: v.created_at,
    }))
}
