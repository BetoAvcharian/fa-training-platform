import { getMyActiveMembership, getAllMembers } from '@/domains/athletes/queries'
import { InviteForm } from './invite-form'
import { DeactivateButton } from './deactivate-button'
import { PersonasList } from './personas-list'

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  coach: 'Entrenador',
  athlete: 'Atleta',
}

export default async function PersonasPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const members = await getAllMembers(membership.organizationId)
  const isManager = membership.role === 'manager'

  // Un entrenador solo ve sus propios atletas acá — no tiene sentido
  // (ni permiso real) que vea al resto del organigrama. El manager
  // sigue viendo todo, es quien administra la organización.
  const visibleMembers = isManager
    ? members
    : members.filter((m) => m.role === 'athlete' && m.coachMembershipId === membership.id)

  const coaches = members
    .filter((m) => m.role === 'coach' && m.status === 'activo')
    .map((c) => ({ id: c.id, name: c.name }))

  const invitados = visibleMembers.filter((m) => m.status === 'invitado')
  const activos = visibleMembers.filter((m) => m.status === 'activo')
  const inactivos = visibleMembers.filter((m) => m.status === 'inactivo')

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Configuración</p>
        <h1 className="font-display text-2xl font-bold text-ink">Personas</h1>
      </div>

      {isManager && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Invitar</h2>
          <InviteForm coaches={coaches} />
        </section>
      )}

      {invitados.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Invitaciones pendientes</h2>
          <div className="space-y-2">
            {invitados.map((m) => (
              <div key={m.id} className="rounded-xl border border-outline bg-panel p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink">{m.email}</p>
                  <p className="text-xs text-status-neutral">{ROLE_LABELS[m.role]} · esperando que acepte</p>
                </div>
                {isManager && <DeactivateButton id={m.id} />}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink">Activos ({activos.length})</h2>
        <PersonasList members={activos} coaches={coaches} isManager={isManager} />
      </section>

      {inactivos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Inactivos</h2>
          <PersonasList members={inactivos} coaches={coaches} isManager={false} />
        </section>
      )}
    </div>
  )
}
