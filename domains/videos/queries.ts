import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import type { Video } from './types'

export async function getVideos(organizationId: string, client?: AppSupabaseClient): Promise<Video[]> {
  const supabase = client ?? (await createServerClient())
  const { data, error } = await supabase
    .from('videos')
    .select('id, organization_id, title, description, source_type, category, url, created_at, created_by_membership_id')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    sourceType: row.source_type as Video['sourceType'],
    category: row.category as Video['category'],
    url: row.url,
    createdAt: row.created_at,
    createdByMembershipId: row.created_by_membership_id,
  }))
}

/**
 * Mismo principio que getVideosForCoach pero visto desde el atleta:
 * nunca debe ver nombres ni contenido de otro equipo. Le es visible
 * un video si: está él mismo etiquetado, lo subió su propio
 * entrenador, o no tiene a nadie etiquetado (biblioteca general).
 */
export async function getVideosForAthlete(
  athleteMembershipId: string,
  coachMembershipId: string | null,
  organizationId: string,
  client?: AppSupabaseClient
): Promise<Video[]> {
  const supabase = client ?? (await createServerClient())

  const [allVideos, tagRows] = await Promise.all([
    getVideos(organizationId, supabase),
    supabase
      .from('video_athlete_tags')
      .select('video_id, athlete_membership_id')
      .then((res) => {
        if (res.error) throw new DomainError('NOT_FOUND', res.error.message)
        return res.data ?? []
      }),
  ])

  const taggedVideoIds = new Set<string>()
  const iAmTaggedVideoIds = new Set<string>()
  for (const row of tagRows) {
    taggedVideoIds.add(row.video_id)
    if (row.athlete_membership_id === athleteMembershipId) iAmTaggedVideoIds.add(row.video_id)
  }

  return allVideos.filter((v) => {
    const untagged = !taggedVideoIds.has(v.id)
    const iAmTagged = iAmTaggedVideoIds.has(v.id)
    const byMyCoach = coachMembershipId !== null && v.createdByMembershipId === coachMembershipId
    return untagged || iAmTagged || byMyCoach
  })
}

/**
 * Un coach NUNCA debe ver nombres ni contenido de atletas de otro
 * equipo — ni siquiera de reojo en un listado de videos. Un video le
 * es visible si: lo subió él mismo, no tiene a nadie etiquetado
 * todavía (contenido general de biblioteca), o tiene etiquetado al
 * menos un atleta propio. Los videos que solo tienen atletas ajenos
 * etiquetados quedan completamente ocultos para este coach.
 */
export async function getVideosForCoach(
  coachMembershipId: string,
  organizationId: string,
  client?: AppSupabaseClient
): Promise<Video[]> {
  const supabase = client ?? (await createServerClient())

  const [allVideos, tagRows] = await Promise.all([
    getVideos(organizationId, supabase),
    supabase
      .from('video_athlete_tags')
      .select('video_id, memberships!video_athlete_tags_athlete_membership_id_fkey(coach_membership_id)')
      .then((res) => {
        if (res.error) throw new DomainError('NOT_FOUND', res.error.message)
        return res.data ?? []
      }),
  ])

  const taggedVideoIds = new Set<string>()
  const ownTeamVideoIds = new Set<string>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of tagRows as any[]) {
    taggedVideoIds.add(row.video_id)
    if (row.memberships?.coach_membership_id === coachMembershipId) ownTeamVideoIds.add(row.video_id)
  }

  return allVideos.filter((v) => {
    const createdByMe = v.createdByMembershipId === coachMembershipId
    const untagged = !taggedVideoIds.has(v.id)
    const ownTeamTagged = ownTeamVideoIds.has(v.id)
    return createdByMe || untagged || ownTeamTagged
  })
}
