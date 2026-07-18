import Link from 'next/link'
import { getAthleteHealthEpisodes } from '@/domains/health/queries'
import { getCycleStats } from '@/domains/health/cycle'
import { getAnthropometryHistory } from '@/domains/observations/anthropometry'
import { createServerClient } from '@/lib/supabase/server'
import { AnthropometryHistory } from '@/app/(athlete)/mi-salud/anthropometry-history'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  lesion: 'Lesión',
  medicacion: 'Medicación',
  ciclo_menstrual: 'Ciclo menstrual',
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AthleteSaludPage({
  params,
}: {
  params: Promise<{ athleteId: string }>
}) {
  const { athleteId } = await params
  const supabase = await createServerClient()

  const { data: athlete } = await supabase
    .from('memberships')
    .select('id, people(first_name, last_name, gender)')
    .eq('id', athleteId)
    .maybeSingle()

  // RLS filtra esto solo, no hace falta chequear rol acá: si no sos el
  // entrenador directo (o el manager, que tampoco tiene acceso a esta
  // tabla — spec 2.8), vas a recibir un array vacío, nunca un error que
  // delate que hay datos ocultos.
  const episodes = await getAthleteHealthEpisodes(athleteId, supabase)
  const anthropometry = await getAnthropometryHistory(athleteId, supabase)
  const gender = (athlete as any)?.people?.gender ?? null
  const cycleStats = gender === 'femenino' ? await getCycleStats(athleteId, supabase) : null

  const athleteName = (athlete as any)?.people
    ? `${(athlete as any).people.first_name} ${(athlete as any).people.last_name}`
    : 'Atleta'

  return (
    <div className="space-y-6">
      <div>
        <Link href="/salud" className="text-xs text-status-neutral hover:text-ink">
          ← Volver a atletas
        </Link>
        <p className="text-xs uppercase tracking-wider text-gold font-medium mt-2">Salud</p>
        <h1 className="font-display text-2xl font-bold text-ink">{athleteName}</h1>
      </div>

      {cycleStats && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-ink">Ciclo menstrual</p>
            <Link href={`/salud/${athleteId}/ciclo`} className="text-xs text-navy underline">
              Ver calendario →
            </Link>
          </div>
          {cycleStats.currentCycleDay === null ? (
            <p className="text-sm text-status-neutral">Todavía no cargó datos de ciclo.</p>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <p>
                <span className="text-ink font-medium">Día {cycleStats.currentCycleDay}</span>{' '}
                <span className="text-status-neutral">del ciclo</span>
              </p>
              {cycleStats.averageCycleLength && (
                <p className="text-status-neutral">Promedio: {cycleStats.averageCycleLength} días</p>
              )}
              {cycleStats.predictedNextPeriod && (
                <p className="text-status-neutral">
                  Próximo:{' '}
                  {new Date(cycleStats.predictedNextPeriod + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {episodes.length === 0 && (
        <div className="rounded-xl border border-outline bg-panel p-5 text-sm text-status-neutral">
          Sin episodios visibles para vos en este momento.
        </div>
      )}

      <div className="space-y-2">
        {episodes.map((e) => (
          <div key={e.id} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-gold font-semibold">{TYPE_LABELS[e.type]}</p>
            <p className="font-medium text-ink">{e.title}</p>
            <p className="text-xs text-status-neutral mt-0.5">
              {formatDate(e.startDate)}
              {e.endDate ? ` — ${formatDate(e.endDate)}` : ''} · {e.status === 'activo' ? 'Activo' : 'Resuelto'}
            </p>
            {e.notes && <p className="text-sm text-ink mt-2">{e.notes}</p>}
          </div>
        ))}
      </div>

      {anthropometry.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-ink">Antropometría y signos vitales</h2>
          <AnthropometryHistory history={anthropometry} />
        </div>
      )}
    </div>
  )
}
