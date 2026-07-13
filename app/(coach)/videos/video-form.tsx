'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createVideoAction } from './actions'

export function VideoForm({
  organizationId,
  roster,
  category,
}: {
  organizationId: string
  roster: Array<{ id: string; person: { firstName: string; lastName: string } | null }>
  category: string
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'link' | 'upload'>('link')
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const title = String(formData.get('title') ?? '')
    const description = String(formData.get('description') ?? '')
    const athleteIds = formData.getAll('athleteIds').map(String)

    if (!title.trim()) {
      setError('Falta el título')
      return
    }

    if (mode === 'link') {
      const url = String(formData.get('url') ?? '')
      if (!url.trim()) {
        setError('Falta el link')
        return
      }
      const fd = new FormData()
      fd.set('title', title)
      fd.set('description', description)
      fd.set('sourceType', 'link')
      fd.set('category', category)
      fd.set('url', url)
      athleteIds.forEach((id) => fd.append('athleteIds', id))
      startTransition(async () => {
        const result = await createVideoAction(fd)
        if (result?.error) setError(result.error)
        else setOpen(false)
      })
      return
    }

    // mode === 'upload': el archivo sube directo desde el navegador a
    // Supabase Storage (los server actions de Next tienen un límite de
    // tamaño de body chico, no sirven para video) — la fila en la tabla
    // se crea recién después, con la URL resultante, vía server action.
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) {
      setError('Falta elegir un archivo')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const path = `${organizationId}/${crypto.randomUUID()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('videos').upload(path, file)
      if (uploadError) {
        setError(uploadError.message)
        setUploading(false)
        return
      }
      const { data: publicUrl } = supabase.storage.from('videos').getPublicUrl(path)

      const fd = new FormData()
      fd.set('title', title)
      fd.set('description', description)
      fd.set('sourceType', 'upload')
      fd.set('category', category)
      fd.set('url', publicUrl.publicUrl)
      athleteIds.forEach((id) => fd.append('athleteIds', id))
      startTransition(async () => {
        const result = await createVideoAction(fd)
        if (result?.error) setError(result.error)
        else setOpen(false)
        setUploading(false)
      })
    } catch {
      setError('No se pudo subir el archivo')
      setUploading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-2 text-sm font-medium text-navy"
      >
        + Agregar video
      </button>
    )
  }

  const busy = pending || uploading

  return (
    <form action={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 max-w-md">
      <div className="flex gap-2 text-xs">
        <button
          type="button"
          onClick={() => setMode('link')}
          className={`flex-1 py-1.5 rounded-lg border ${mode === 'link' ? 'bg-navy text-white border-navy' : 'border-gray-300 text-status-neutral'}`}
        >
          Link (YouTube/Vimeo)
        </button>
        <button
          type="button"
          onClick={() => setMode('upload')}
          className={`flex-1 py-1.5 rounded-lg border ${mode === 'upload' ? 'bg-navy text-white border-navy' : 'border-gray-300 text-status-neutral'}`}
        >
          Subir archivo
        </button>
      </div>

      <input name="title" placeholder="Título" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" required />
      <textarea name="description" placeholder="Descripción (opcional)" rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />

      {mode === 'link' ? (
        <input name="url" placeholder="https://youtube.com/..." className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" />
      ) : (
        <input name="file" type="file" accept="video/*" className="w-full text-sm" />
      )}

      {roster.length > 0 && (
        <div>
          <p className="text-xs text-status-neutral mb-1">Etiquetar atletas</p>
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
            {roster.map((r) => (
              <label key={r.id} className="flex items-center gap-1 text-xs bg-gray-50 rounded-full px-2 py-1">
                <input type="checkbox" name="athleteIds" value={r.id} />
                {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
              </label>
            ))}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-status-critical">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
          {uploading ? 'Subiendo…' : pending ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 rounded-lg border border-gray-200 text-sm text-status-neutral">
          Cancelar
        </button>
      </div>
    </form>
  )
}
