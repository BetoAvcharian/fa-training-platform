import Link from 'next/link'
import { getMyActiveMembership, getAthletesForCoach, getRoster } from '@/domains/athletes/queries'
import { getPlans, getObjectives } from '@/domains/planning/queries'
import { getEventsForRange } from '@/domains/events/queries'
import { PlanForm } from './plan-form'
import { PlanEditButton } from './plan-edit-button'
import { ObjectiveForm } from './objective-form'
import { ObjectiveEditButton } from './objective-edit-button'
import { AchieveButton } from './achieve-button'
import { AnnualGrid } from './annual-grid'
import { FullscreenChart } from '@/components/ui/fullscreen-chart'

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

export default async function PlanificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; year?: string }>
}) {
  const params = await searchParams
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

  const vistaAnual = params.vista === 'anual'
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear()

  let annualSection: React.ReactNode = null
  if (vistaAnual) {
    const yearFrom = `${year}-01-01`
    const yearTo = `${year}-12-31`

    const objectivesByPlanArr = new Map<string, typeof objectives>()
    for (const o of objectives) {
      if (!o.planId) continue
      const list = objectivesByPlanArr.get(o.planId) ?? []
      list.push(o)
      objectivesByPlanArr.set(o.planId, list)
    }

    const macrociclos = plans
      .filter((p) => p.type === 'macrociclo' && p.startDate && p.endDate)
      .map((p) => ({
        id: p.id,
        type: 'macrociclo' as const,
        title: p.title,
        startDate: p.startDate!,
        endDate: p.endDate!,
        parentPlanId: p.parentPlanId,
        objectives: (objectivesByPlanArr.get(p.id) ?? []).map((o) => ({ category: o.category, description: o.description ?? '' })),
      }))

    const mesociclos = plans
      .filter((p) => p.type === 'mesociclo' && p.startDate && p.endDate)
      .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
      .map((p) => ({
        id: p.id,
        type: 'mesociclo' as const,
        title: p.title,
        startDate: p.startDate!,
        endDate: p.endDate!,
        parentPlanId: p.parentPlanId,
        objectives: (objectivesByPlanArr.get(p.id) ?? []).map((o) => ({ category: o.category, description: o.description ?? '' })),
      }))

    const yearEvents = await getEventsForRange(membership.organizationId, yearFrom, yearTo)
    const competitions = yearEvents
      .filter((e) => e.type === 'competencia' && e.date)
      .map((e) => ({ id: e.id, title: e.title, date: e.date as string }))

    annualSection = (
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-ink">Vista anual {year}</h2>
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/planificacion?vista=anual&year=${year - 1}`} className="px-2 py-1 rounded-md border border-outline">
              ← {year - 1}
            </Link>
            <Link href={`/planificacion?vista=anual&year=${year + 1}`} className="px-2 py-1 rounded-md border border-outline">
              {year + 1} →
            </Link>
          </div>
        </div>

        {macrociclos.length === 0 && mesociclos.length === 0 ? (
          <div className="rounded-xl border border-outline bg-panel p-4 text-sm text-status-neutral">
            Todavía no hay macrociclos ni mesociclos con fechas cargadas para {year}. Cargalos abajo en "Árbol de planes" — acá se
            van a dibujar solos.
          </div>
        ) : (
          <div className="card p-4">
            <FullscreenChart title={`Planificación anual ${year}`}>
              <AnnualGrid year={year} macrociclos={macrociclos} mesociclos={mesociclos} competitions={competitions} />
            </FullscreenChart>
            <p className="text-[11px] text-status-neutral mt-3">
              🏁 = competencia · tocá y arrastrá los bordes de un mesociclo (dorado) para mover sus fechas — se guarda solo y se
              refleja también en la lista de abajo.
            </p>
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Planificación</p>
          <h1 className="font-display text-2xl font-bold text-ink">Temporadas y objetivos</h1>
        </div>
        <div className="flex rounded-lg border border-outline overflow-hidden text-xs">
          <Link href="/planificacion" className={`px-3 py-1.5 ${!vistaAnual ? 'bg-navy text-white' : 'bg-panel text-ink'}`}>
            Lista
          </Link>
          <Link
            href={`/planificacion?vista=anual&year=${year}`}
            className={`px-3 py-1.5 ${vistaAnual ? 'bg-navy text-white' : 'bg-panel text-ink'}`}
          >
            Anual
          </Link>
        </div>
      </div>

      {vistaAnual && annualSection}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Árbol de planes</h2>
          <PlanForm plans={plans.map((p) => ({ id: p.id, title: p.title, type: p.type }))} />
        </div>

        {plans.length === 0 && (
          <div className="rounded-xl border border-outline bg-panel p-4 text-sm text-status-neutral">
            Todavía no hay temporadas ni ciclos cargados.
          </div>
        )}

        <div className="space-y-2">
          {plans
            .filter((p) => !p.parentPlanId)
            .map((root) => (
              <div key={root.id} className="card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gold font-semibold">{TYPE_LABELS[root.type]}</p>
                    <p className="font-medium text-ink">{root.title}</p>
                    {(root.startDate || root.endDate) && (
                      <p className="text-xs text-status-neutral">
                        {formatDate(root.startDate)} — {formatDate(root.endDate)}
                      </p>
                    )}
                  </div>
                  <PlanEditButton plan={{ id: root.id, title: root.title, startDate: root.startDate, endDate: root.endDate }} />
                </div>
                <div className="mt-2 space-y-1 pl-3 border-l-2 border-outline">
                  {plans
                    .filter((p) => p.parentPlanId === root.id)
                    .map((child) => (
                      <div key={child.id} className="flex items-center justify-between gap-2">
                        <p className="text-sm text-ink">
                          <span className="text-xs text-status-neutral">{TYPE_LABELS[child.type]}</span> {child.title}
                        </p>
                        <PlanEditButton plan={{ id: child.id, title: child.title, startDate: child.startDate, endDate: child.endDate }} />
                      </div>
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
          <div className="rounded-xl border border-outline bg-panel p-4 text-sm text-status-neutral">
            Sin objetivos pendientes.
          </div>
        )}

        <div className="space-y-2">
          {pendientes.map((o) => {
            const athlete = rosterById.get(o.athleteMembershipId)
            return (
              <div key={o.id} className="rounded-xl border border-outline bg-panel p-4 shadow-sm flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gold font-semibold">
                    {CATEGORY_LABELS[o.category]}
                    {athlete?.person ? ` · ${athlete.person.firstName} ${athlete.person.lastName}` : ''}
                  </p>
                  <p className="text-sm text-ink mt-0.5">{o.description}</p>
                  {o.targetDate && <p className="text-xs text-status-neutral mt-0.5">Meta: {formatDate(o.targetDate)}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ObjectiveEditButton objective={{ id: o.id, category: o.category, description: o.description, targetDate: o.targetDate }} />
                  <AchieveButton id={o.id} />
                </div>
              </div>
            )
          })}
        </div>

        {logrados.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-status-neutral uppercase tracking-wide">Logrados</p>
            {logrados.map((o) => (
              <div key={o.id} className="rounded-xl border border-outline bg-panel p-4 opacity-60 flex items-center justify-between gap-2">
                <p className="text-sm text-ink">{o.description}</p>
                <ObjectiveEditButton objective={{ id: o.id, category: o.category, description: o.description, targetDate: o.targetDate }} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
