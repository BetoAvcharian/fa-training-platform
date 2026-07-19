import Link from 'next/link'
import { getMyActiveMembership, getAthletesForCoach, getRoster } from '@/domains/athletes/queries'
import { getPlans, getObjectives } from '@/domains/planning/queries'
import { getEventsForRange } from '@/domains/events/queries'
import { PlanForm } from './plan-form'
import { AthleteFilter } from './athlete-filter'
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

const ROADMAP_PALETTE = [
  { bg: 'bg-[#1E3A5F]/10', border: 'border-[#1E3A5F]/40', text: 'text-[#1E3A5F]', icon: '🔥' },
  { bg: 'bg-[#0F766E]/10', border: 'border-[#0F766E]/40', text: 'text-[#0F766E]', icon: '⚡' },
  { bg: 'bg-[#C2570B]/10', border: 'border-[#C2570B]/40', text: 'text-[#C2570B]', icon: '🏆' },
  { bg: 'bg-[#7C3AED]/10', border: 'border-[#7C3AED]/40', text: 'text-[#7C3AED]', icon: '🌊' },
  { bg: 'bg-[#4D7C4D]/10', border: 'border-[#4D7C4D]/40', text: 'text-[#4D7C4D]', icon: '🌿' },
  { bg: 'bg-[#BE185D]/10', border: 'border-[#BE185D]/40', text: 'text-[#BE185D]', icon: '✨' },
]

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function PlanificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; year?: string; atleta?: string }>
}) {
  const params = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [allPlans, allObjectives, roster] = await Promise.all([
    getPlans(membership.organizationId),
    getObjectives(membership.organizationId),
    (membership.role === 'manager' ? getRoster(membership.organizationId) : getAthletesForCoach(membership.id)),
  ])

  const rosterById = new Map(roster.map((r) => [r.id, r]))

  // Cada atleta puede tener un programa de entrenamiento distinto —
  // por eso Planificación siempre muestra el plan de UN atleta a la
  // vez, nunca todos mezclados en la misma grilla/árbol. Si no eligió
  // ninguno todavía, arranca con el primero de la lista.
  const selectedAthleteId = params.atleta || roster[0]?.id
  const plans = selectedAthleteId ? allPlans.filter((p) => p.athleteMembershipId === selectedAthleteId) : []
  const objectives = selectedAthleteId ? allObjectives.filter((o) => o.athleteMembershipId === selectedAthleteId) : []

  const pendientes = objectives.filter((o) => !o.achieved)
  const logrados = objectives.filter((o) => o.achieved)

  const vistaAnual = params.vista === 'anual'
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear()

  function withAthlete(href: string) {
    if (!selectedAthleteId) return href
    return `${href}${href.includes('?') ? '&' : '?'}atleta=${selectedAthleteId}`
  }

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
        objectives: (objectivesByPlanArr.get(p.id) ?? []).map((o) => ({
          id: o.id,
          category: o.category,
          description: o.description ?? '',
          targetDate: o.targetDate,
        })),
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
        objectives: (objectivesByPlanArr.get(p.id) ?? []).map((o) => ({
          id: o.id,
          category: o.category,
          description: o.description ?? '',
          targetDate: o.targetDate,
        })),
      }))

    const yearEvents = selectedAthleteId ? await getEventsForRange(membership.organizationId, yearFrom, yearTo) : []
    const competitions = yearEvents
      .filter((e) => e.type === 'competencia' && e.date)
      .map((e) => ({ id: e.id, title: e.title, date: e.date as string }))

    annualSection = (
      <section className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-ink">Vista anual {year}</h2>
          <div className="flex items-center gap-2 text-sm">
            <Link href={withAthlete(`/planificacion?vista=anual&year=${year - 1}`)} className="px-2 py-1 rounded-md border border-outline">
              ← {year - 1}
            </Link>
            <Link href={withAthlete(`/planificacion?vista=anual&year=${year + 1}`)} className="px-2 py-1 rounded-md border border-outline">
              {year + 1} →
            </Link>
          </div>
        </div>

        {macrociclos.length === 0 && mesociclos.length === 0 ? (
          <div className="rounded-xl border border-outline bg-panel p-4 text-sm text-status-neutral">
            Todavía no hay macrociclos ni mesociclos con fechas cargadas para este atleta en {year}. Cargalos abajo en "Árbol de
            planes" — acá se van a dibujar solos.
          </div>
        ) : (
          <div className="card p-4">
            <FullscreenChart title={`Planificación anual ${year}`}>
              <AnnualGrid year={year} macrociclos={macrociclos} mesociclos={mesociclos} competitions={competitions} />
            </FullscreenChart>
            <p className="text-[11px] text-status-neutral mt-3">
              🏁 = competencia · tocá y arrastrá los bordes de un mesociclo (dorado) para mover sus fechas, o tocá el bloque para
              editarlo del todo.
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
          <Link href={withAthlete('/planificacion')} className={`px-3 py-1.5 ${!vistaAnual ? 'bg-navy text-white' : 'bg-panel text-ink'}`}>
            Lista
          </Link>
          <Link
            href={withAthlete(`/planificacion?vista=anual&year=${year}`)}
            className={`px-3 py-1.5 ${vistaAnual ? 'bg-navy text-white' : 'bg-panel text-ink'}`}
          >
            Anual
          </Link>
        </div>
      </div>

      {/* Cada atleta tiene su propio programa — este selector define de
          cuál se ve el plan/diagrama, nunca se mezclan varios juntos. */}
      <div className="max-w-xs">
        <label className="text-xs text-status-neutral mb-1 block">Atleta</label>
        <AthleteFilter roster={roster} selectedAthleteId={selectedAthleteId} vistaAnual={vistaAnual} />
      </div>

      {vistaAnual && annualSection}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Hoja de ruta de la temporada</h2>
          <PlanForm plans={plans.map((p) => ({ id: p.id, title: p.title, type: p.type }))} roster={roster} defaultAthleteId={selectedAthleteId} />
        </div>

        {plans.length === 0 && (
          <div className="rounded-xl border border-outline bg-panel p-4 text-sm text-status-neutral">
            Todavía no hay temporadas ni ciclos cargados para este atleta.
          </div>
        )}

        <div className="space-y-6">
          {plans
            .filter((p) => !p.parentPlanId)
            .map((root) => {
              const macrociclos = plans
                .filter((p) => p.parentPlanId === root.id && p.type === 'macrociclo')
                .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
              const otherChildren = plans.filter((p) => p.parentPlanId === root.id && p.type !== 'macrociclo')

              return (
                <div key={root.id}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gold font-semibold">{TYPE_LABELS[root.type]}</p>
                      <p className="font-display text-lg font-bold text-ink">{root.title}</p>
                      {(root.startDate || root.endDate) && (
                        <p className="text-xs text-status-neutral">
                          {formatDate(root.startDate)} — {formatDate(root.endDate)}
                        </p>
                      )}
                    </div>
                    <PlanEditButton plan={{ id: root.id, title: root.title, startDate: root.startDate, endDate: root.endDate }} />
                  </div>

                  {macrociclos.length > 0 ? (
                    <div className="overflow-x-auto pb-2">
                      <div className="flex items-stretch gap-0 min-w-max">
                        {macrociclos.map((m, i) => {
                          const palette = ROADMAP_PALETTE[i % ROADMAP_PALETTE.length]
                          const mesociclos = plans.filter((p) => p.parentPlanId === m.id)
                          return (
                            <div key={m.id} className="flex items-stretch">
                              <div className={`w-56 rounded-2xl border-2 ${palette.border} ${palette.bg} p-4 flex flex-col`}>
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-2xl">{palette.icon}</span>
                                  <PlanEditButton plan={{ id: m.id, title: m.title, startDate: m.startDate, endDate: m.endDate }} />
                                </div>
                                <p className={`font-display font-bold mt-1 ${palette.text}`}>{m.title}</p>
                                <p className="text-[11px] text-status-neutral mt-0.5">
                                  {formatDate(m.startDate)} — {formatDate(m.endDate)}
                                </p>
                                {mesociclos.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-outline/60 space-y-1">
                                    {mesociclos.map((meso) => (
                                      <div key={meso.id} className="flex items-center justify-between gap-1">
                                        <p className="text-[11px] text-ink truncate">⚙️ {meso.title}</p>
                                        <PlanEditButton plan={{ id: meso.id, title: meso.title, startDate: meso.startDate, endDate: meso.endDate }} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {i < macrociclos.length - 1 && (
                                <div className="flex items-center px-1 text-status-neutral text-lg">→</div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-status-neutral">Sin macrociclos cargados todavía — agregalos con "+ Nuevo plan".</p>
                  )}

                  {otherChildren.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {otherChildren.map((child) => (
                        <div key={child.id} className="flex items-center gap-1.5 rounded-full border border-outline bg-panel px-3 py-1">
                          <span className="text-xs text-ink">
                            {TYPE_LABELS[child.type]}: {child.title}
                          </span>
                          <PlanEditButton plan={{ id: child.id, title: child.title, startDate: child.startDate, endDate: child.endDate }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Objetivos</h2>
          <ObjectiveForm roster={roster} defaultAthleteId={selectedAthleteId} />
        </div>

        {pendientes.length === 0 && (
          <div className="rounded-xl border border-outline bg-panel p-4 text-sm text-status-neutral">
            Sin objetivos pendientes para este atleta.
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
