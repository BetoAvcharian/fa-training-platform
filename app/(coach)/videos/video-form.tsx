'use client'

import { useState, useTransition, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { createVideoAction } from './actions'
import { Modal } from '@/components/ui/modal'

interface RosterEntry {
  id: string
  person: { firstName: string; lastName: string } | null
}

function AthleteTagPicker({ roster, selected, onChange }: { roster: RosterEntry[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)

  const nameOf = (id: string) => {
    const r = roster.find((x) => x.id === id)
    return r?.person ? `${r.person.firstName} ${r.person.lastName}` : '—'
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return roster
      .filter((r) => !selected.includes(r.id))
      .filter((r) => {
        if (!q) return true
        const name = r.person ? `${r.person.firstName} ${r.person.lastName}`.toLowerCase() : ''
        return name.includes(q)
      })
      .slice(0, 8)
  }, [roster, selected, query])

  return (
    <div>
      <p className="text-xs text-status-neutral mb-1">Etiquetar atletas</p>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {selected.map((id) => (
            <span key={id} className="text-xs bg-gold/10 text-navy rounded-full px-2 py-1 flex items-center gap-1">
              {nameOf(id)}
              <button type="button" onClick={() => onChange(selected.filter((x) => x !== id))} className="text-status-neutral hover:text-status-critical">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Buscar atleta por nombre…"
          className="input-field"
        />
        {focused && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
            {filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onChange([...selected, r.id])
                  setQuery('')
                }}
                className="w-full text-left px-3 py-2 text-sm text-navy hover:bg-gray-50"
              >
                {r.person ? `${r.person.firstName} ${r.person.lastName}` : '—'}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function VideoForm({
  organizationId,
  roster,
  category,
}: {
  organizationId: string
  roster: RosterEntry[]
  category?: string
}) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'link' | 'upload'>('link')
  const [selectedCategory, setSelectedCategory] = useState(category && category !== 'todos' ? category : 'entrenamientos')
  const [athleteIds, setAthleteIds] = useState<string[]>([])
  const [pending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formData: FormData) {
    setError(null)
    const title = String(formData.get('title') ?? '')
    const description = String(formData.get('description') ?? '')

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
      fd.set('category', selectedCategory)
      fd.set('url', url)
      athleteIds.forEach((id) => fd.append('athleteIds', id))
      startTransition(async () => {
        const result = await createVideoAction(fd)
        if (result?.error) setError(result.error)
        else {
          setOpen(false)
          setAthleteIds([])
        }
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
      fd.set('category', selectedCategory)
      fd.set('url', publicUrl.publicUrl)
      athleteIds.forEach((id) => fd.append('athleteIds', id))
      startTransition(async () => {
        const result = await createVideoAction(fd)
        if (result?.error) setError(result.error)
        else {
          setOpen(false)
          setAthleteIds([])
        }
        setUploading(false)
      })
    } catch {
      setError('No se pudo subir el archivo')
      setUploading(false)
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary px-4 py-2 text-sm">
        + Subir video
      </button>
    )
  }

  const busy = pending || uploading

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary px-4 py-2 text-sm">
        + Subir video
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Subir video">
        <form action={handleSubmit} className="space-y-4">
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setMode('link')}
              className={`flex-1 py-2 rounded-lg border ${mode === 'link' ? 'bg-navy text-white border-navy' : 'border-gray-300 text-status-neutral'}`}
            >
              Link (YouTube/Vimeo)
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`flex-1 py-2 rounded-lg border ${mode === 'upload' ? 'bg-navy text-white border-navy' : 'border-gray-300 text-status-neutral'}`}
            >
              Subir archivo
            </button>
          </div>

          <div>
            <label className="text-xs text-status-neutral mb-1 block">Título</label>
            <input name="title" placeholder="Título" className="input-field" required />
          </div>
          <div>
            <label className="text-xs text-status-neutral mb-1 block">Descripción (opcional)</label>
            <textarea name="description" rows={2} className="input-field" />
          </div>

          <div>
            <label className="text-xs text-status-neutral mb-1 block">Categoría</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input-field">
              <option value="carreras">Carreras</option>
              <option value="tecnica">Técnica</option>
              <option value="musculacion">Musculación</option>
              <option value="entrenamientos">Entrenamientos</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-status-neutral mb-1 block">{mode === 'link' ? 'Link' : 'Archivo'}</label>
            {mode === 'link' ? (
              <input name="url" placeholder="https://youtube.com/..." className="input-field" />
            ) : (
              <input name="file" type="file" accept="video/*" className="w-full text-sm" />
            )}
          </div>

          {roster.length > 0 && <AthleteTagPicker roster={roster} selected={athleteIds} onChange={setAthleteIds} />}

          {error && <p className="text-xs text-status-critical">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={busy} className="flex-1 btn-primary py-2.5 text-sm">
              {uploading ? 'Subiendo…' : pending ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-4 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
