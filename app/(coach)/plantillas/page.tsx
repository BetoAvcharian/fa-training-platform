import { getMyActiveMembership, getRoster, getAthletesForCoach, getGroups } from '@/domains/athletes/queries'
import { getTrainingTemplates } from '@/domains/events/queries'
import { TemplateForm } from './template-form'
import { TemplateCard } from './apply-template-form'

export const dynamic = 'force-dynamic'

export default async function PlantillasPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const [templates, roster, groups] = await Promise.all([
    getTrainingTemplates(membership.organizationId),
    membership.role === 'manager' ? getRoster(membership.organizationId) : getAthletesForCoach(membership.id),
    getGroups(membership.organizationId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-gold font-medium">Planificación</p>
          <h1 className="font-display text-2xl font-bold text-ink">Plantillas de entrenamiento</h1>
          <p className="text-xs text-status-neutral mt-1">
            Armá el entrenamiento una vez, aplicalo a cualquier día y a los atletas que quieras, las veces que hagan falta.
          </p>
        </div>
        <TemplateForm />
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-outline bg-panel p-6 text-sm text-status-neutral text-center">
          Todavía no tenés plantillas — creá la primera con "+ Nueva plantilla".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} roster={roster} groups={groups} />
          ))}
        </div>
      )}
    </div>
  )
}
