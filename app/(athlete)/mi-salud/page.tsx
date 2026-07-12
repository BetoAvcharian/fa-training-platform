import { getMyHealthEpisodes } from '@/domains/health/queries'
import { HealthForm } from './health-form'
import { ResolveButton } from './resolve-button'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  lesion: 'Lesión',
  medicacion: 'Medicación',
  ciclo_menstrual: 'Ciclo menstrual',
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MiSaludPage() {
  const episodes = await getMyHealthEpisodes()
  const activos = episodes.filter((e) => e.status === 'activo')
  const resueltos = episodes.filter((e) => e.status === 'resuelto')

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Salud</p>
        <h1 className="font-display text-2xl font-bold text-navy">Mi salud</h1>
        <p className="text-xs text-status-neutral mt-1">
          Solo vos y tu entrenador pueden ver esto.
        </p>
      </div>

      <HealthForm />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-navy">Activos</h2>
        {activos.length === 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-4 text-sm text-status-neutral">
            Nada activo por ahora.
          </div>
        )}
        <div className="space-y-2">
          {activos.map((e) => (
            <div key={e.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gold font-semibold">{TYPE_LABELS[e.type]}</p>
                  <p className="font-medium text-navy">{e.title}</p>
                  <p className="text-xs text-status-neutral mt-0.5">Desde {formatDate(e.startDate)}</p>
                  {e.notes && <p className="text-sm text-navy mt-2">{e.notes}</p>}
                </div>
                <ResolveButton id={e.id} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {resueltos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">Resueltos</h2>
          <div className="space-y-2">
            {resueltos.map((e) => (
              <div key={e.id} className="rounded-2xl border border-gray-100 bg-white p-4 opacity-60">
                <p className="text-xs uppercase tracking-wide text-status-neutral font-semibold">{TYPE_LABELS[e.type]}</p>
                <p className="font-medium text-navy">{e.title}</p>
                <p className="text-xs text-status-neutral mt-0.5">
                  {formatDate(e.startDate)} — {e.endDate ? formatDate(e.endDate) : ''}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
