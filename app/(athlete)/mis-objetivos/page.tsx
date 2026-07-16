import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getObjectives } from '@/domains/planning/queries'
import { MyObjectiveForm } from './objective-form'
import { AchieveMyObjectiveButton } from './achieve-button'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  deportivo: 'Deportivo',
  salud: 'Salud',
  fisico: 'Físico',
  personal: 'Personal',
}

function formatDate(date: string | null) {
  if (!date) return ''
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MisObjetivosPage() {
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const objectives = await getObjectives(membership.organizationId, membership.id)
  const pendientes = objectives.filter((o) => !o.achieved)
  const logrados = objectives.filter((o) => o.achieved)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Planificación</p>
        <h1 className="font-display text-2xl font-bold text-ink">Mis objetivos</h1>
      </div>

      <MyObjectiveForm />

      {pendientes.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-panel p-4 text-sm text-status-neutral">
          Sin objetivos cargados todavía.
        </div>
      )}

      <div className="space-y-2">
        {pendientes.map((o) => (
          <div key={o.id} className="rounded-2xl border border-gray-100 bg-panel p-4 shadow-sm flex items-start justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gold font-semibold">{CATEGORY_LABELS[o.category]}</p>
              <p className="text-sm text-ink mt-0.5">{o.description}</p>
              {o.targetDate && <p className="text-xs text-status-neutral mt-0.5">Meta: {formatDate(o.targetDate)}</p>}
            </div>
            <AchieveMyObjectiveButton id={o.id} />
          </div>
        ))}
      </div>

      {logrados.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-status-neutral uppercase tracking-wide">Logrados</p>
          {logrados.map((o) => (
            <div key={o.id} className="rounded-2xl border border-gray-100 bg-panel p-4 opacity-60">
              <p className="text-sm text-ink">{o.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
