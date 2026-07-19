import { getMyActiveMembership, getOrganization, getGroups, getRoster, getGroupMembers, getAthletesForCoach } from '@/domains/athletes/queries'
import { GroupForm } from './group-form'
import { CopyJoinCode } from './copy-join-code'
import { GroupMembersEditor } from './group-members-editor'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [org, groups, roster] = await Promise.all([
    getOrganization(membership.organizationId),
    getGroups(membership.organizationId),
    (membership.role === 'manager' ? getRoster(membership.organizationId) : getAthletesForCoach(membership.id)),
  ])

  const groupsWithMembers = await Promise.all(
    groups.map(async (g) => ({ group: g, members: await getGroupMembers(g.id) }))
  )

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Configuración</p>
        <h1 className="font-display text-2xl font-bold text-ink">{org?.name ?? 'Organización'}</h1>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-1.5">🔗 Código de invitación</h2>
        <p className="text-xs text-status-neutral">
          Compartilo con entrenadores y atletas para que se sumen a tu equipo.
        </p>
        <div className="card p-4 border-2 border-gold/30 bg-gradient-to-br from-gold/5 to-transparent">
          {org && <CopyJoinCode code={org.joinCode} />}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-1.5">👥 Grupos</h2>
          <GroupForm />
        </div>

        {groups.length === 0 && (
          <div className="rounded-xl border border-outline bg-panel p-4 text-sm text-status-neutral">
            Todavía no armaste ningún grupo.
          </div>
        )}

        <div className="space-y-2">
          {groupsWithMembers.map(({ group: g, members }) => (
            <div key={g.id} className="card p-4 space-y-2">
              <p className="font-medium text-ink text-sm">{g.name}</p>
              <GroupMembersEditor groupId={g.id} members={members} roster={roster} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-ink flex items-center gap-1.5">🧑‍🤝‍🧑 Personas</h2>
        <a href="/atletas" className="card-hover p-4 flex items-center justify-between text-sm text-ink">
          Invitar entrenadores/atletas y asignarlos
          <span className="text-navy">→</span>
        </a>
      </section>
    </div>
  )
}
