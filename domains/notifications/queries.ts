import { createServerClient, type AppSupabaseClient } from '@/lib/supabase/server'
import { DomainError } from '@/types/errors'
import { getMyActiveMembership } from '@/domains/athletes/queries'

export interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  readAt: string | null
  createdAt: string
}

export async function getMyNotifications(limit = 30, client?: AppSupabaseClient): Promise<Notification[]> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('recipient_membership_id', membership.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new DomainError('NOT_FOUND', error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    readAt: row.read_at,
    createdAt: row.created_at,
  }))
}

export async function getUnreadCount(client?: AppSupabaseClient): Promise<number> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_membership_id', membership.id)
    .is('read_at', null)

  if (error) return 0
  return count ?? 0
}

export async function markAsRead(id: string, client?: AppSupabaseClient): Promise<void> {
  const supabase = client ?? (await createServerClient())
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
}

export async function markAllAsRead(client?: AppSupabaseClient): Promise<void> {
  const supabase = client ?? (await createServerClient())
  const membership = await getMyActiveMembership(supabase)
  if (!membership) return

  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_membership_id', membership.id)
    .is('read_at', null)
}
