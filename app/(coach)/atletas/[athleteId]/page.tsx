import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { getEventsForAthlete } from '@/domains/events/queries'
import { getAthleteRecords, getAthleteResults } from '@/domains/performance/queries'
import { getAthleteHealthEpisodes } from '@/domains/health/queries'
import { getCycleStats } from '@/domains/health/cycle'
import { getAnthropometryHistory } from '@/domains/observations/anthropometry'
import { getVideosForAthlete } from '@/domains/videos/tags'
import { getMyActiveMembership } from '@/domains/athletes/queries'
import { getObjectives } from '@/domains/planning/queries'
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
    .select('id, status, coach_membership_id, people(first_name, last_name, email, birth_date, gender, phone, club)')
    .eq('id', athleteId)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const athleteRow = athlete as any
  const athleteName = athleteRow?.people ? `${athleteRow.people.first_name} ${athleteRow.people.last_name}` : 'Atleta'
  const initials = athleteRow?.people ? `${athleteRow.people.first_name[0] ?? ''}${athleteRow.people.last_name[0] ?? ''}`.toUpperCase() : '—'

  let coachName: string | null = null
  if (athleteRow?.coach_membership_id) {
    const { data: coach } = await supabase
      .from('memberships')
      .select('people(first_name, last_name)')
      .eq('id', athleteRow.coach_membership_id)
      .maybeSingle()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coachRow = coach as any
    coachName = coachRow?.people ? `${coachRow.people.first_name} ${coachRow.people.last_name}` : null
  }

  let age: number | null = null
  if (athleteRow?.people?.birth_date) {
    const birth = new Date(athleteRow.people.birth_date + 'T00:00:00')
    const today = new Date()
    age = today.getFullYear() - birth.getFullYear() - (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0)
  }

  return (
    <div className="space-y-6">
      <Link href="/atletas" className="text-xs text-status-neutral hover:text-ink">
        ← Volver a atletas
      </Link>

      {/* Header ficha premium — todo lo que hace falta saber de un vistazo */}
      <div className="card p-5 bg-gradient-to-br from-navy/5 to-transparent">
        <div className="flex items-start gap-4 flex-wrap">
          <span className="w-16 h-16 rounded-2xl bg-navy text-white flex items-center justify-center text-xl font-bold font-display shrink-0">
            {initials}
          </span>
          <div className="flex-1 min-w-[200px]">
            <h1 className="font-display text-2xl font-bold text-ink leading-tight">{athleteName}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-status-neutral">
              {age !== null && <span>{age} años</span>}
              {athleteRow?.people?.gender && <span>{GENDER_LABELS[athleteRow.people.gender] ?? athleteRow.people.gender}</span>}
              {athleteRow?.people?.club && <span>🏛️ {athleteRow.people.club}</span>}
              {coachName && <span>👤 Coach: {coachName}</span>}
            </div>
          </div>
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
  const [events, records, results, objectives, checkins] = await Promise.all([
    getEventsForAthlete(athleteId, 40),
    getAthleteRecords(athleteId, organizationId),
    getAthleteResults(athleteId, organizationId, 5),
    getObjectives(organizationId).then((all) => all.filter((o) => o.athleteMembershipId === athleteId)),
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

  const oficiales = records.filter((r) => r.recordType === 'oficial')
  const mejorMarca = oficiales[0]
  const proximaCompetencia = events
    .filter((e) => e.type === 'competencia' && e.date && e.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0]
  const objetivoPrincipal = objectives.find((o) => !o.achieved)
  const objetivosLogrados = objectives.filter((o) => o.achieved).length
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const entrenosSemana = events.filter(
    (e) => e.type === 'entrenamiento' && e.date && new Date(e.date + 'T00:00:00') >= weekStart
  ).length
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ultimoCheckin = (checkins as any[])[0]

  return (
    <div className="space-y-5">
      {/* Panel resumen — todo visible sin scroll */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard icon="🏆" label="Mejor marca" value={mejorMarca ? formatMark(mejorMarca.value, mejorMarca.unitSymbol) : '—'} sub={mejorMarca?.observableName} tone="orange" />
        <SummaryCard
          icon="📅"
          label="Próxima competencia"
          value={proximaCompetencia ? formatDate(proximaCompetencia.date!) : 'Sin agendar'}
          sub={proximaCompetencia?.title}
          tone="blue"
        />
        <SummaryCard icon="🎯" label="Objetivo principal" value={objetivoPrincipal ? objetivoPrincipal.description ?? '—' : 'Sin pendientes'} tone="green" small />
        <SummaryCard
          icon="⚡"
          label="Estado actual"
          value={ultimoCheckin ? `${ultimoCheckin.observables?.name}: ${ultimoCheckin.value}` : 'Sin check-in'}
          sub={ultimoCheckin ? formatDate(ultimoCheckin.date) : undefined}
          tone="neutral"
        />
        <SummaryCard icon="💪" label="Entrenamientos esta semana" value={String(entrenosSemana)} tone="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-4 lg:col-span-1">
          <p className="text-sm font-semibold text-ink mb-3">Evolución reciente</p>
          {events.filter((e) => e.type === 'entrenamiento').length === 0 && <p className="text-sm text-status-neutral">Sin actividad todavía.</p>}
          <div className="space-y-2">
            {events
              .filter((e) => e.type === 'entrenamiento')
              .slice(0, 6)
              .map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-navy shrink-0" />
                  <span className="text-status-neutral text-xs shrink-0">{e.date ? formatDate(e.date) : ''}</span>
                  <span className="text-ink truncate">{e.title}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="card p-4 lg:col-span-1">
          <p className="text-sm font-semibold text-ink mb-3">Últimas competencias</p>
          {results.length === 0 && <p className="text-sm text-status-neutral">Sin competencias registradas.</p>}
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm text-ink truncate">{r.observableName}</p>
                  <p className="text-xs text-status-neutral">{formatDate(r.date)}</p>
                </div>
                <span className="font-display font-bold text-navy shrink-0">{formatMark(r.value, r.unitSymbol)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 lg:col-span-1">
          <p className="text-sm font-semibold text-ink mb-3">Progreso de objetivos</p>
          {objectives.length === 0 ? (
            <p className="text-sm text-status-neutral">Sin objetivos cargados.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-2 rounded-full bg-outline overflow-hidden">
                  <div
                    className="h-full bg-status-positive rounded-full"
                    style={{ width: `${Math.round((objetivosLogrados / objectives.length) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-status-neutral shrink-0">
                  {objetivosLogrados}/{objectives.length}
                </span>
              </div>
              <div className="space-y-1.5">
                {objectives.slice(0, 4).map((o) => (
                  <p key={o.id} className="text-sm text-ink flex items-center gap-1.5">
                    <span>{o.achieved ? '✅' : '⏳'}</span>
                    <span className={o.achieved ? 'line-through text-status-neutral' : ''}>{o.description}</span>
                  </p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  sub,
  tone,
  small,
}: {
  icon: string
  label: string
  value: string
  sub?: string | null
  tone: 'blue' | 'green' | 'orange' | 'neutral'
  small?: boolean
}) {
  const toneClasses: Record<string, string> = {
    blue: 'bg-navy/10 text-navy',
    green: 'bg-status-positive/10 text-status-positive',
    orange: 'bg-gold/10 text-gold',
    neutral: 'bg-status-neutral/10 text-status-neutral',
  }
  return (
    <div className="card p-3.5">
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs mb-2 ${toneClasses[tone]}`}>{icon}</span>
      <p className={`font-display font-bold text-ink leading-tight ${small ? 'text-sm line-clamp-2' : 'text-lg'}`}>{value}</p>
      <p className="text-[11px] text-status-neutral mt-1">{label}</p>
      {sub && <p className="text-[11px] text-status-neutral/70 truncate">{sub}</p>}
    </div>
  )
}

async function EntrenamientosTab({ athleteId }: { athleteId: string }) {
  const allEvents = await getEventsForAthlete(athleteId, 30)
  const events = allEvents.filter((e) => e.type === 'entrenamiento')
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
              <div>
                <p className="text-ink">{h.observableName}</p>
                <p className="text-xs text-status-neutral">{formatDate(h.date)}</p>
              </div>
              <p className="font-medium text-ink">{formatMark(h.value, h.unitSymbol)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
