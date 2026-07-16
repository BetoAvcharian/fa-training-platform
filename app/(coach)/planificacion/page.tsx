import { getMyActiveMembership, getAthletesForCoach, getRoster } from '@/domains/athletes/queries'
import { getPlans, getObjectives } from '@/domains/planning/queries'
import { PlanForm } from './plan-form'
import { ObjectiveForm } from './objective-form'
import { AchieveButton } from './achieve-button'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  deportivo: 'Deportivo',
  salud: 'Salud',
  fisico: 'Físico',
  personal: 'Personal',
}

const TYPE_LABELS: Record<string, string> = {
  temporada: 'Temporada',
  macrociclo: 'Macrociclo',
  mesociclo: 'Mesociclo',
  microciclo: 'Microciclo',
}

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PlanificacionPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [plans, objectives, roster] = await Promise.all([
    getPlans(membership.organizationId),
    getObjectives(membership.organizationId),
    (membership.role === 'manager' ? getRoster(membership.organizationId) : getAthletesForCoach(membership.id)),
  ])

  const rosterById = new Map(roster.map((r) => [r.id, r]))
  const pendientes = objectives.filter((o) => !o.achieved)
  const logrados = objectives.filter((o) => o.achieved)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Planificación</p>
        <h1 className="font-display text-2xl font-bold text-ink">Temporadas y objetivos</h1>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Árbol de planes</h2>
          <PlanForm plans={plans.map((p) => ({ id: p.id, title: p.title, type: p.type }))} />
        </div>

        {plans.length === 0 && (
          <div className="rounded-xl border border-gray-100 bg-panel p-4 text-sm text-status-neutral">
            Todavía no hay temporadas ni ciclos cargados.
          </div>
        )}

        <div className="space-y-2">
          {plans
            .filter((p) => !p.parentPlanId)
            .map((root) => (
              <div key={root.id} className="card p-4">
                <p className="text-xs uppercase tracking-wide text-gold font-semibold">{TYPE_LABELS[root.type]}</p>
                <p className="font-medium text-ink">{root.title}</p>
                <div className="mt-2 space-y-1 pl-3 border-l-2 border-gray-100">
                  {plans
                    .filter((p) => p.parentPlanId === root.id)
                    .map((child) => (
                      <p key={child.id} className="text-sm text-ink">
                        <span className="text-xs text-status-neutral">{TYPE_LABELS[child.type]}</span> {child.title}
                      </p>
                    ))}
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Objetivos</h2>
          <ObjectiveForm roster={roster} />
        </div>

        {pendientes.length === 0 && (
          <div className="rounded-xl border border-gray-100 bg-panel p-4 text-sm text-status-neutral">
            Sin objetivos pendientes.
          </div>
        )}

        <div className="space-y-2">
          {pendientes.map((o) => {
            const athlete = rosterById.get(o.athleteMembershipId)
            return (
              <div key={o.id} className="rounded-xl border border-gray-100 bg-panel p-4 shadow-sm flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gold font-semibold">
                    {CATEGORY_LABELS[o.category]}
                    {athlete?.person ? ` · ${athlete.person.firstName} ${athlete.person.lastName}` : ''}
                  </p>
                  <p className="text-sm text-ink mt-0.5">{o.description}</p>
                  {o.targetDate && <p className="text-xs text-status-neutral mt-0.5">Meta: {formatDate(o.targetDate)}</p>}
                </div>
                <AchieveButton id={o.id} />
              </div>
            )
          })}
        </div>

        {logrados.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-status-neutral uppercase tracking-wide">Logrados</p>
            {logrados.map((o) => (
              <div key={o.id} className="rounded-xl border border-gray-100 bg-panel p-4 opacity-60">
                <p className="text-sm text-ink">{o.description}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
