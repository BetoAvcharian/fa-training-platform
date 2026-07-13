import { getMyNotifications } from '@/domains/notifications/queries'
import { markNotificationReadAction, markAllNotificationsReadAction } from './actions'

export const dynamic = 'force-dynamic'

const TYPE_ICONS: Record<string, string> = {
  nuevo_entrenamiento: '🏃',
  nuevo_feedback: '💬',
  proxima_competencia: '🏁',
  nuevo_record: '🏆',
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default async function MisNotificacionesPage() {
  const notifications = await getMyNotifications()
  const unread = notifications.filter((n) => !n.readAt)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Notificaciones</p>
          <h1 className="font-display text-2xl font-bold text-navy">Notificaciones</h1>
        </div>
        {unread.length > 0 && (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="text-xs text-navy underline">
              Marcar todas
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-center text-sm text-status-neutral">
          Sin notificaciones todavía.
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <form
            key={n.id}
            action={async () => {
              'use server'
              await markNotificationReadAction(n.id)
            }}
          >
            <button
              type="submit"
              className={`w-full text-left rounded-2xl border border-gray-100 bg-white p-4 shadow-sm flex items-start gap-3 ${!n.readAt ? 'bg-gold/5' : ''}`}
            >
              <span className="text-lg shrink-0">{TYPE_ICONS[n.type] ?? '🔔'}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.readAt ? 'font-semibold text-navy' : 'text-navy'}`}>{n.title}</p>
                {n.body && <p className="text-xs text-status-neutral">{n.body}</p>}
                <p className="text-[10px] text-status-neutral mt-0.5">{formatDate(n.createdAt)}</p>
              </div>
              {!n.readAt && <span className="w-2 h-2 rounded-full bg-gold shrink-0 mt-1.5" />}
            </button>
          </form>
        ))}
      </div>
    </div>
  )
}
