import Link from 'next/link'
import { getMyActiveMembership, getAllMembers } from '@/domains/athletes/queries'
import { InviteForm } from './invite-form'
import { DeactivateButton } from './deactivate-button'
import { ReassignCoachSelect } from './reassign-coach-select'

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

  const coaches = members
    .filter((m) => m.role === 'coach' && m.status === 'activo')
    .map((c) => ({ id: c.id, name: c.name }))

  const invitados = members.filter((m) => m.status === 'invitado')
  const activos = members.filter((m) => m.status === 'activo')
  const inactivos = members.filter((m) => m.status === 'inactivo')

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Configuración</p>
        <h1 className="font-display text-2xl font-bold text-navy">Personas</h1>
      </div>

      {isManager && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">Invitar</h2>
          <InviteForm coaches={coaches} />
        </section>
      )}

      {invitados.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">Invitaciones pendientes</h2>
          <div className="space-y-2">
            {invitados.map((m) => (
              <div key={m.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-sm text-navy">{m.email}</p>
                  <p className="text-xs text-status-neutral">{ROLE_LABELS[m.role]} · esperando que acepte</p>
                </div>
                {isManager && <DeactivateButton id={m.id} />}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-navy">Activos</h2>
        <div className="space-y-2">
          {activos.map((m) => (
            <div key={m.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm flex items-center justify-between gap-2">
              <div>
                {m.role === 'athlete' ? (
                  <Link href={`/atletas/${m.id}`} className="text-sm font-medium text-navy underline">
                    {m.name ?? m.email ?? '—'}
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-navy">{m.name ?? m.email ?? '—'}</p>
                )}
                <p className="text-xs text-status-neutral">{ROLE_LABELS[m.role]}</p>
              </div>
              <div className="flex items-center gap-2">
                {isManager && m.role === 'athlete' && (
                  <ReassignCoachSelect athleteMembershipId={m.id} currentCoachId={m.coachMembershipId} coaches={coaches} />
                )}
                {isManager && m.role !== 'manager' && <DeactivateButton id={m.id} />}
              </div>
            </div>
          ))}
        </div>
      </section>

      {inactivos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">Inactivos</h2>
          <div className="space-y-2">
            {inactivos.map((m) => (
              <div key={m.id} className="rounded-xl border border-gray-100 bg-white p-4 opacity-60">
                <p className="text-sm text-navy">{m.name ?? m.email ?? '—'}</p>
                <p className="text-xs text-status-neutral">{ROLE_LABELS[m.role]}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
