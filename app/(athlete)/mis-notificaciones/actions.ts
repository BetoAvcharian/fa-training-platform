'use server'

import { revalidatePath } from 'next/cache'
import { markAsRead, markAllAsRead } from '@/domains/notifications/queries'

export async function markNotificationReadAction(id: string) {
  await markAsRead(id)
  revalidatePath('/mis-notificaciones')
}

export async function markAllNotificationsReadAction() {
  await markAllAsRead()
  revalidatePath('/mis-notificaciones')
}
