import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { getEventsForAthlete } from '@/domains/events/queries'
import { getAthleteRecords, getAthleteResults } from '@/domains/performance/queries'
import { getAthleteHealthEpisodes } from '@/domains/health/queries'
import { getAnthropometryHistory } from '@/domains/observations/anthropometry'
import { getVideosForAthlete } from '@/domains/videos/tags'
import { getMyActiveMembership } from '@/domains/athletes/queries'

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
        <Link href="/atletas" className="text-xs text-status-neutral hover:text-navy">
          ← Volver a atletas
        </Link>
        <h1 className="font-display text-2xl font-bold text-navy mt-2">{athleteName}</h1>
        {athleteRow?.people?.email && <p className="text-xs text-status-neutral">{athleteRow.people.email}</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-status-neutral">
          {athleteRow?.people?.birth_date && <span>Nacimiento: {athleteRow.people.birth_date}</span>}
          {athleteRow?.people?.gender && <span>Género: {GENDER_LABELS[athleteRow.people.gender] ?? athleteRow.people.gender}</span>}
          {athleteRow?.people?.phone && <span>Tel: {athleteRow.people.phone}</span>}
          {athleteRow?.people?.club && <span>Club: {athleteRow.people.club}</span>}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/atletas/${athleteId}?tab=${t.key}`}
            className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px ${
              tab === t.key ? 'border-gold text-navy font-medium' : 'border-transparent text-status-neutral'
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
      {tab === 'salud' && <SaludTab athleteId={athleteId} />}
    </div>
  )
}

async function ResumenTab({ athleteId, organizationId }: { athleteId: string; organizationId: string }) {
  const [events, records] = await Promise.all([
    getEventsForAthlete(athleteId, 5),
    getAthleteRecords(athleteId, organizationId),
  ])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="card p-4">
        <p className="text-sm font-semibold text-navy mb-2">Últimos entrenamientos</p>
        {events.length === 0 && <p className="text-sm text-status-neutral">Sin actividad todavía.</p>}
        {events.map((e) => (
          <p key={e.id} className="text-sm text-navy py-1 border-b border-gray-50 last:border-0">
            {e.date ? formatDate(e.date) : ''} — {e.title}
          </p>
        ))}
      </div>
      <div className="card p-4">
        <p className="text-sm font-semibold text-navy mb-2">Récords oficiales</p>
        {records.filter((r) => r.recordType === 'oficial').length === 0 && (
          <p className="text-sm text-status-neutral">Sin récords todavía.</p>
        )}
        {records
          .filter((r) => r.recordType === 'oficial')
          .map((r) => (
            <p key={r.id} className="text-sm text-navy py-1 border-b border-gray-50 last:border-0">
              {r.observableName}: <span className="font-medium">{r.value}{r.unitSymbol ? ` ${r.unitSymbol}` : ''}</span>
            </p>
          ))}
      </div>
    </div>
  )
}

async function EntrenamientosTab({ athleteId }: { athleteId: string }) {
  const events = await getEventsForAthlete(athleteId, 30)
  return (
    <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
      {events.length === 0 && <p className="p-4 text-sm text-status-neutral">Sin historial todavía.</p>}
      {events.map((e) => (
        <div key={e.id} className="p-3 flex items-center justify-between text-sm">
          <div>
            <p className="text-xs text-gold font-medium">{TYPE_LABELS[e.type] ?? e.type}</p>
            <p className="text-navy">{e.title}</p>
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
        <p className="text-sm font-semibold text-navy mb-2">Récords</p>
        {records.length === 0 && <p className="text-sm text-status-neutral">Sin récords todavía.</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {records.map((r) => (
            <div key={r.id} className="text-sm text-navy border border-gray-100 rounded-lg p-2">
              {r.observableName}: <span className="font-medium">{r.value}{r.unitSymbol ? ` ${r.unitSymbol}` : ''}</span>
              <span className="text-xs text-status-neutral"> ({r.recordType})</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        <p className="p-3 text-sm font-semibold text-navy">Todos los resultados</p>
        {results.length === 0 && <p className="p-4 text-sm text-status-neutral">Sin resultados todavía.</p>}
        {results.map((r) => (
          <div key={r.id} className="p-3 flex items-center justify-between text-sm">
            <div>
              <p className="text-navy">{r.observableName}</p>
              <p className="text-xs text-status-neutral">{formatDate(r.date)}</p>
            </div>
            <p className="font-medium text-navy">{r.value}{r.unitSymbol ? ` ${r.unitSymbol}` : ''}</p>
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
        <div key={v.id} className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="font-medium text-navy text-sm">{v.title}</p>
          {v.description && <p className="text-xs text-status-neutral mt-1">{v.description}</p>}
        </div>
      ))}
    </div>
  )
}

async function SaludTab({ athleteId }: { athleteId: string }) {
  const [episodes, anthropometry] = await Promise.all([
    getAthleteHealthEpisodes(athleteId),
    getAnthropometryHistory(athleteId),
  ])

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <p className="text-sm font-semibold text-navy mb-2">Episodios</p>
        {episodes.length === 0 && (
          <p className="text-sm text-status-neutral">Sin episodios visibles para vos en este momento.</p>
        )}
        {episodes.map((e) => (
          <div key={e.id} className="text-sm text-navy py-1 border-b border-gray-50 last:border-0">
            <span className="text-xs text-gold font-medium">{HEALTH_LABELS[e.type]}</span> — {e.title}
          </div>
        ))}
      </div>
      {anthropometry.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          <p className="p-3 text-sm font-semibold text-navy">Antropometría y signos vitales</p>
          {anthropometry.map((h) => (
            <div key={h.id} className="p-3 flex items-center justify-between text-sm">
              <p className="text-navy">{h.observableName}</p>
              <p className="font-medium text-navy">{h.value}{h.unitSymbol ? ` ${h.unitSymbol}` : ''}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
