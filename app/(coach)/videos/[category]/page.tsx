import Link from 'next/link'
import { getMyActiveMembership, getRoster } from '@/domains/athletes/queries'
import { getVideos } from '@/domains/videos/queries'
import { getAthletesForVideo } from '@/domains/videos/tags'
import { VideoForm } from '../video-form'
import { VideoCard } from '../video-card'

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  carreras: 'Carreras',
  tecnica: 'Técnica',
  musculacion: 'Musculación',
  entrenamientos: 'Entrenamientos',
  todos: 'Todos los videos',
}

export default async function VideoCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ atleta?: string; desde?: string; hasta?: string; etiquetados?: string }>
}) {
  const { category } = await params
  const sParams = await searchParams
  const membership = await getMyActiveMembership()
  if (!membership) return null

  if (!CATEGORY_LABELS[category]) {
    return (
      <div className="space-y-4">
        <Link href="/videos" className="text-xs text-status-neutral hover:text-navy">
          ← Volver
        </Link>
        <p className="text-sm text-status-neutral">Categoría no encontrada.</p>
      </div>
    )
  }

  const [videos, roster] = await Promise.all([
    getVideos(membership.organizationId),
    getRoster(membership.organizationId),
  ])
  const canManage = membership.role === 'manager' || membership.role === 'coach'

  let filtered = category === 'todos' ? videos : videos.filter((v) => v.category === category)
  if (sParams.desde) filtered = filtered.filter((v) => v.createdAt.slice(0, 10) >= sParams.desde!)
  if (sParams.hasta) filtered = filtered.filter((v) => v.createdAt.slice(0, 10) <= sParams.hasta!)

  const videosWithTags = await Promise.all(
    filtered.map(async (v) => ({ video: v, tags: await getAthletesForVideo(v.id) }))
  )

  let visible = sParams.atleta
    ? videosWithTags.filter(({ tags }) => tags.some((t) => t.id === sParams.atleta))
    : videosWithTags

  if (sParams.etiquetados === '1') {
    visible = visible.filter(({ tags }) => tags.length > 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/videos" className="text-xs text-status-neutral hover:text-navy">
          ← Volver a categorías
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap mt-2">
          <div>
            <p className="text-xs uppercase tracking-wider text-gold font-medium">Videos</p>
            <h1 className="font-display text-2xl font-bold text-navy">{CATEGORY_LABELS[category]}</h1>
          </div>
          {canManage && category !== 'todos' && <VideoForm organizationId={membership.organizationId} roster={roster} category={category} />}
        </div>
      </div>

      <form className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-status-neutral block mb-1">Atleta</label>
          <select name="atleta" defaultValue={sParams.atleta ?? ''} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {roster.map((r) => (
              <option key={r.id} value={r.id}>
                {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-status-neutral block mb-1">Desde</label>
          <input type="date" name="desde" defaultValue={sParams.desde ?? ''} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-xs text-status-neutral block mb-1">Hasta</label>
          <input type="date" name="hasta" defaultValue={sParams.hasta ?? ''} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm" />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-navy pb-2">
          <input type="checkbox" name="etiquetados" value="1" defaultChecked={sParams.etiquetados === '1'} />
          Solo etiquetados
        </label>
        <button type="submit" className="btn-primary px-4 py-1.5 text-sm">
          Filtrar
        </button>
      </form>

      {visible.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-status-neutral">
          No hay videos acá todavía.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map(({ video: v, tags }) => (
          <VideoCard
            key={v.id}
            id={v.id}
            title={v.title}
            description={v.description}
            sourceType={v.sourceType}
            url={v.url}
            canManage={canManage}
            taggedAthletes={tags}
          />
        ))}
      </div>
    </div>
  )
}
