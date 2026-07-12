import { getMyActiveMembership, getOrganization, getGroups } from '@/domains/athletes/queries'
import { GroupForm } from './group-form'
import { CopyJoinCode } from './copy-join-code'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [org, groups] = await Promise.all([
    getOrganization(membership.organizationId),
    getGroups(membership.organizationId),
  ])

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Configuración</p>
        <h1 className="font-display text-2xl font-bold text-navy">{org?.name ?? 'Organización'}</h1>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-navy">Código de invitación</h2>
        <p className="text-xs text-status-neutral">
          Compartilo con entrenadores y atletas para que se sumen a tu equipo.
        </p>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          {org && <CopyJoinCode code={org.joinCode} />}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-navy">Grupos</h2>
          <GroupForm />
        </div>

        {groups.length === 0 && (
          <div className="rounded-xl border border-gray-100 bg-white p-4 text-sm text-status-neutral">
            Todavía no armaste ningún grupo.
          </div>
        )}

        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="font-medium text-navy text-sm">{g.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-navy">Personas</h2>
        <a href="/atletas" className="text-sm text-navy underline">
          Invitar entrenadores/atletas y asignarlos →
        </a>
      </section>
    </div>
  )
}
