import Link from 'next/link'
import { getMyActiveMembership, getRoster, getMyCoachMembershipId, getAthletesForCoach } from '@/domains/athletes/queries'
import { getVideosForAthlete } from '@/domains/videos/queries'
import { getAthletesForVideo } from '@/domains/videos/tags'
import { VideoCard } from '@/app/(coach)/videos/video-card'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  carreras: 'Carreras',
  tecnica: 'Técnica',
  musculacion: 'Musculación',
  entrenamientos: 'Entrenamientos',
  todos: 'Todos los videos',
}

export default async function MisVideosCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ mios?: string; q?: string }>
}) {
  const { category } = await params
  const sParams = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  if (!CATEGORY_LABELS[category]) {
    return (
      <div className="space-y-4">
        <Link href="/mis-videos" className="text-xs text-status-neutral hover:text-ink">
          ← Volver
        </Link>
        <p className="text-sm text-status-neutral">Categoría no encontrada.</p>
      </div>
    )
  }

  const coachMembershipId = await getMyCoachMembershipId()
  const videos = await getVideosForAthlete(membership.id, coachMembershipId, membership.organizationId)
  const roster = coachMembershipId ? await getAthletesForCoach(coachMembershipId) : await getRoster(membership.organizationId)
  let filtered = category === 'todos' ? videos : videos.filter((v) => v.category === category)
  if (sParams.q) {
    const q = sParams.q.toLowerCase()
    filtered = filtered.filter((v) => v.title.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q))
  }

  const videosWithTags = await Promise.all(
    filtered.map(async (v) => ({ video: v, tags: await getAthletesForVideo(v.id, coachMembershipId ?? undefined) }))
  )

  const visible =
    sParams.mios === '1'
      ? videosWithTags.filter(({ tags }) => tags.some((t) => t.id === membership.id))
      : videosWithTags

  return (
    <div className="space-y-4">
      <div>
        <Link href="/mis-videos" className="text-xs text-status-neutral hover:text-ink">
          ← Volver a categorías
        </Link>
        <h1 className="font-display text-2xl font-bold text-ink mt-1">{CATEGORY_LABELS[category]}</h1>
      </div>

      <Link href="/mis-videos" className="text-xs text-ink underline">
        + Subir video
      </Link>

      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={sParams.q ?? ''}
          placeholder="Buscar por título o descripción…"
          className="flex-1 rounded-lg border border-outline px-3 py-1.5 text-sm"
        />
        {sParams.mios === '1' && <input type="hidden" name="mios" value="1" />}
        <button type="submit" className="btn-primary px-4 py-1.5 text-sm">
          Buscar
        </button>
      </form>

      <a
        href={`?mios=${sParams.mios === '1' ? '' : '1'}`}
        className={`inline-block rounded-full px-4 py-1.5 text-xs font-medium ${
          sParams.mios === '1' ? 'bg-navy text-white' : 'bg-panel border border-outline text-ink'
        }`}
      >
        {sParams.mios === '1' ? '✓ Solo donde estoy etiquetado' : 'Solo donde estoy etiquetado'}
      </a>

      {visible.length === 0 && (
        <div className="rounded-2xl border border-gray-100 bg-panel p-6 text-center text-sm text-status-neutral">
          No hay videos acá todavía.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map(({ video: v, tags }) => (
          <VideoCard
            key={v.id}
            id={v.id}
            title={v.title}
            description={v.description}
            sourceType={v.sourceType}
            url={v.url}
            canManage={false}
            taggedAthletes={tags}
          />
        ))}
      </div>
    </div>
  )
}
