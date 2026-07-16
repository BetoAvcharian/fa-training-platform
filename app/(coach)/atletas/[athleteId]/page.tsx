import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { getEventsForAthlete } from '@/domains/events/queries'
import { getAthleteRecords, getAthleteResults } from '@/domains/performance/queries'
import { getAthleteHealthEpisodes } from '@/domains/health/queries'
import { getCycleStats } from '@/domains/health/cycle'
import { getAnthropometryHistory } from '@/domains/observations/anthropometry'
import { getVideosForAthlete } from '@/domains/videos/tags'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { formatMark } from '@/lib/format-mark'

export const dynamic = 'force-dynamic'

const TABS = [
  { key: 'resumen', label: 'Resumen' },
  { key: 'entrenamientos', label: 'Entrenamientos' },
  { key: 'resultados', label: 'Resultados' },
  { key: 'videos', label: 'Videos' },
  { key: 'salud', label: 'Salud' },
]

const GENDER_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  otro: 'Otro',
  prefiero_no_decir: 'Prefiero no decir',
}

const TYPE_LABELS: Record<string, string> = {
  entrenamiento: 'Entrenamiento',
  competencia: 'Competencia',
  viaje: 'Viaje',
  concentracion: 'Concentración',
  medico: 'Médico',
  reunion: 'Reunión',
}

const HEALTH_LABELS: Record<string, string> = {
  lesion: 'Lesión',
  medicacion: 'Medicación',
  ciclo_menstrual: 'Ciclo menstrual',
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AthleteProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ athleteId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { athleteId } = await params
  const { tab = 'resumen' } = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  const supabase = await createServerClient()
  const { data: athlete } = await supabase
    .from('memberships')
    .select('id, status, people(first_name, last_name, email, birth_date, gender, phone, club)')
    .eq('id', athleteId)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const athleteRow = athlete as any
  const athleteName = athleteRow?.people ? `${athleteRow.people.first_name} ${athleteRow.people.last_name}` : 'Atleta'

  return (
    <div className="space-y-6">
      <div>
        <Link href="/atletas" className="text-xs text-status-neutral hover:text-ink">
          ← Volver a atletas
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink mt-2">{athleteName}</h1>
        {athleteRow?.people?.email && <p className="text-xs text-status-neutral">{athleteRow.people.email}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-status-neutral">
          {athleteRow?.people?.birth_date && <span>Nacimiento: {athleteRow.people.birth_date}</span>}
          {athleteRow?.people?.gender && <span>Género: {GENDER_LABELS[athleteRow.people.gender] ?? athleteRow.people.gender}</span>}
          {athleteRow?.people?.phone && <span>Tel: {athleteRow.people.phone}</span>}
          {athleteRow?.people?.club && <span>Club: {athleteRow.people.club}</span>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-outline overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/atletas/${athleteId}?tab=${t.key}`}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
              tab === t.key ? 'border-gold text-ink font-medium' : 'border-transparent text-status-neutral'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === 'resumen' && <ResumenTab athleteId={athleteId} organizationId={membership.organizationId} />}
      {tab === 'entrenamientos' && <EntrenamientosTab athleteId={athleteId} />}
      {tab === 'resultados' && <ResultadosTab athleteId={athleteId} organizationId={membership.organizationId} />}
      {tab === 'videos' && <VideosTab athleteId={athleteId} />}
      {tab === 'salud' && <SaludTab athleteId={athleteId} gender={athleteRow?.people?.gender ?? null} />}
    </div>
  )
}

async function ResumenTab({ athleteId, organizationId }: { athleteId: string; organizationId: string }) {
  const supabase = await createServerClient()
  const [events, records, checkins] = await Promise.all([
    getEventsForAthlete(athleteId, 5),
    getAthleteRecords(athleteId, organizationId),
    supabase
      .from('observations')
      .select('date, value, observables!inner(name, tags)')
      .eq('athlete_membership_id', athleteId)
      .overlaps('observables.tags', ['checkin'])
      .is('superseded_by', null)
      .order('date', { ascending: false })
      .limit(12)
      .then((r) => r.data ?? []),
  ])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="card p-4">
        <p className="text-sm font-semibold text-ink mb-2">Últimos entrenamientos</p>
        {events.length === 0 && <p className="text-sm text-status-neutral">Sin actividad todavía.</p>}
        {events.map((e) => (
          <p key={e.id} className="text-sm text-ink py-1 border-b border-outline last:border-0">
            {e.date ? formatDate(e.date) : ''} — {e.title}
          </p>
        ))}
      </div>
      <div className="card p-4">
        <p className="text-sm font-semibold text-ink mb-2">Récords oficiales</p>
        {records.filter((r) => r.recordType === 'oficial').length === 0 && (
          <p className="text-sm text-status-neutral">Sin récords todavía.</p>
        )}
        {records
          .filter((r) => r.recordType === 'oficial')
          .map((r) => (
            <p key={r.id} className="text-sm text-ink py-1 border-b border-outline last:border-0">
              {r.observableName}: <span className="font-medium">{formatMark(r.value, r.unitSymbol)}</span>
            </p>
          ))}
      </div>
      <div className="card p-4 sm:col-span-2">
        <p className="text-sm font-semibold text-ink mb-2">Bienestar (check-in diario)</p>
        {checkins.length === 0 && <p className="text-sm text-status-neutral">Sin check-ins registrados todavía.</p>}
        <div className="flex flex-wrap gap-2">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(checkins as any[]).map((c, i) => (
            <span key={i} className="text-xs bg-outline/40 rounded-full px-2 py-1 text-ink">
              {formatDate(c.date)} · {c.observables?.name}: <span className="font-medium">{c.value}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

async function EntrenamientosTab({ athleteId }: { athleteId: string }) {
  const events = await getEventsForAthlete(athleteId, 30)
  return (
    <div className="rounded-xl border border-outline bg-panel divide-y divide-outline">
      {events.length === 0 && <p className="p-4 text-sm text-status-neutral">Sin historial todavía.</p>}
      {events.map((e) => (
        <div key={e.id} className="p-3 flex items-center justify-between text-sm">
          <div>
            <p className="text-xs text-gold font-medium">{TYPE_LABELS[e.type] ?? e.type}</p>
            <p className="text-ink">{e.title}</p>
          </div>
          <span className="text-xs text-status-neutral">{e.date ? formatDate(e.date) : ''}</span>
        </div>
      ))}
    </div>
  )
}

async function ResultadosTab({ athleteId, organizationId }: { athleteId: string; organizationId: string }) {
  const [records, results] = await Promise.all([
    getAthleteRecords(athleteId, organizationId),
    getAthleteResults(athleteId, organizationId, 30),
  ])

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-sm font-semibold text-ink mb-2">Récords</p>
        {records.length === 0 && <p className="text-sm text-status-neutral">Sin récords todavía.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {records.map((r) => (
            <div key={r.id} className="text-sm text-ink border border-outline rounded-lg p-2">
              {r.observableName}: <span className="font-medium">{formatMark(r.value, r.unitSymbol)}</span>
              <span className="text-xs text-status-neutral"> ({r.recordType})</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-outline bg-panel divide-y divide-outline">
        <p className="p-3 text-sm font-semibold text-ink">Todos los resultados</p>
        {results.length === 0 && <p className="p-4 text-sm text-status-neutral">Sin resultados todavía.</p>}
        {results.map((r) => (
          <div key={r.id} className="p-3 flex items-center justify-between text-sm">
            <div>
              <p className="text-ink">{r.observableName}</p>
              <p className="text-xs text-status-neutral">{formatDate(r.date)}</p>
            </div>
            <p className="font-medium text-ink">{formatMark(r.value, r.unitSymbol)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

async function VideosTab({ athleteId }: { athleteId: string }) {
  const videos = await getVideosForAthlete(athleteId)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {videos.length === 0 && <p className="text-sm text-status-neutral">Sin videos etiquetados todavía.</p>}
      {videos.map((v) => (
        <div key={v.id} className="rounded-xl border border-outline bg-panel p-3">
          <p className="font-medium text-ink text-sm">{v.title}</p>
          {v.description && <p className="text-xs text-status-neutral mt-1">{v.description}</p>}
        </div>
      ))}
    </div>
  )
}

async function SaludTab({ athleteId, gender }: { athleteId: string; gender: string | null }) {
  const [episodes, anthropometry, cycleStats] = await Promise.all([
    getAthleteHealthEpisodes(athleteId),
    getAnthropometryHistory(athleteId),
    gender === 'femenino' ? getCycleStats(athleteId) : Promise.resolve(null),
  ])
  const activos = episodes.filter((e) => e.status === 'activo')
  const resueltos = episodes.filter((e) => e.status === 'resuelto')

  return (
    <div className="space-y-4">
      {cycleStats && (
        <div className="card p-4">
          <p className="text-sm font-semibold text-ink mb-2">Ciclo menstrual</p>
          {cycleStats.currentCycleDay === null ? (
            <p className="text-sm text-status-neutral">Todavía no cargó datos de ciclo.</p>
          ) : (
            <div className="flex gap-4 text-sm">
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

      <div className="card p-4">
        <p className="text-sm font-semibold text-ink mb-2">Episodios activos</p>
        {activos.length === 0 && (
          <p className="text-sm text-status-neutral">Sin episodios activos visibles para vos en este momento.</p>
        )}
        {activos.map((e) => (
          <div key={e.id} className="text-sm text-ink py-1 border-b border-outline last:border-0">
            <span className="text-xs text-gold font-medium">{HEALTH_LABELS[e.type]}</span> — {e.title}
          </div>
        ))}
      </div>
      {resueltos.length > 0 && (
        <details className="card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">Mostrar resueltos ({resueltos.length})</summary>
          <div className="p-4 pt-0">
            {resueltos.map((e) => (
              <div key={e.id} className="text-sm text-ink py-1 border-b border-outline last:border-0 opacity-60">
                <span className="text-xs text-status-neutral font-medium">{HEALTH_LABELS[e.type]}</span> — {e.title}
              </div>
            ))}
          </div>
        </details>
      )}
      {anthropometry.length > 0 && (
        <div className="rounded-xl border border-outline bg-panel divide-y divide-outline">
          <p className="p-3 text-sm font-semibold text-ink">Antropometría y signos vitales</p>
          {anthropometry.map((h) => (
            <div key={h.id} className="p-3 flex items-center justify-between text-sm">
              <p className="text-ink">{h.observableName}</p>
              <p className="font-medium text-ink">{formatMark(h.value, h.unitSymbol)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
