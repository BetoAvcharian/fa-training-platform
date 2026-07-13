import Link from 'next/link'
import { getAthleteHealthEpisodes } from '@/domains/health/queries'
import { getAnthropometryHistory } from '@/domains/observations/anthropometry'
import { createServerClient } from '@/lib/supabase/server'

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
    .select('id, people(first_name, last_name)')
    .eq('id', athleteId)
    .maybeSingle()

  // RLS filtra esto solo, no hace falta chequear rol acá: si no sos el
  // entrenador directo (o el manager, que tampoco tiene acceso a esta
  // tabla — spec 2.8), vas a recibir un array vacío, nunca un error que
  // delate que hay datos ocultos.
  const episodes = await getAthleteHealthEpisodes(athleteId, supabase)
  const anthropometry = await getAnthropometryHistory(athleteId, supabase)

  const athleteName = (athlete as any)?.people
    ? `${(athlete as any).people.first_name} ${(athlete as any).people.last_name}`
    : 'Atleta'

  return (
    <div className="space-y-6">
      <div>
        <Link href="/salud" className="text-xs text-status-neutral hover:text-navy">
          ← Volver a atletas
        </Link>
        <p className="text-xs uppercase tracking-wider text-gold font-medium mt-2">Salud</p>
        <h1 className="font-display text-2xl font-bold text-navy">{athleteName}</h1>
      </div>

      {episodes.length === 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-5 text-sm text-status-neutral">
          Sin episodios visibles para vos en este momento.
        </div>
      )}

      <div className="space-y-2">
        {episodes.map((e) => (
          <div key={e.id} className="card p-4">
            <p className="text-xs uppercase tracking-wide text-gold font-semibold">{TYPE_LABELS[e.type]}</p>
            <p className="font-medium text-navy">{e.title}</p>
            <p className="text-xs text-status-neutral mt-0.5">
              {formatDate(e.startDate)}
              {e.endDate ? ` — ${formatDate(e.endDate)}` : ''} · {e.status === 'activo' ? 'Activo' : 'Resuelto'}
            </p>
            {e.notes && <p className="text-sm text-navy mt-2">{e.notes}</p>}
          </div>
        ))}
      </div>

      {anthropometry.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-navy">Antropometría y signos vitales</h2>
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
            {anthropometry.map((h) => (
              <div key={h.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-navy text-sm">{h.observableName}</p>
                  <p className="text-xs text-status-neutral">{formatDate(h.date)}</p>
                </div>
                <p className="font-semibold text-navy">
                  {h.value}
                  {h.unitSymbol ? ` ${h.unitSymbol}` : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
