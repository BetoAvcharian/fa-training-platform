'use client'

import { useState, useTransition } from 'react'
import { updateHealthEpisodeAction } from './actions'
import { ResolveButton } from './resolve-button'

const TYPE_LABELS: Record<string, string> = {
  lesion: 'Lesión',
  medicacion: 'Medicación',
  ciclo_menstrual: 'Ciclo menstrual',
}

function formatDate(date: string) {
  return new Date(date + 'T00:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Episode {
  id: string
  type: string
  title: string
  startDate: string
  notes: string | null
}

export function EditableHealthCard({ episode }: { episode: Episode }) {
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateHealthEpisodeAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setError(null)
        setEditing(false)
      }
    })
  }

  if (editing) {
    return (
      <form action={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-2">
        <input type="hidden" name="id" value={episode.id} />
        <p className="text-xs uppercase tracking-wide text-gold font-semibold">{TYPE_LABELS[episode.type]}</p>
        <input name="title" defaultValue={episode.title} className="input-field" required />
        <input name="startDate" type="date" defaultValue={episode.startDate} className="input-field" />
        <textarea name="notes" defaultValue={episode.notes ?? ''} rows={2} className="input-field" />
        {error && <p className="text-xs text-status-critical">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="flex-1 btn-primary py-2 text-sm">
            Guardar
          </button>
          <button type="button" onClick={() => setEditing(false)} className="btn-secondary px-4 text-sm">
            Cancelar
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-gold font-semibold">{TYPE_LABELS[episode.type]}</p>
          <p className="font-medium text-navy">{episode.title}</p>
          <p className="text-xs text-status-neutral mt-0.5">Desde {formatDate(episode.startDate)}</p>
          {episode.notes && <p className="text-sm text-navy mt-2">{episode.notes}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <button onClick={() => setEditing(true)} className="text-xs text-navy underline">
            Editar
          </button>
          <ResolveButton id={episode.id} />
        </div>
      </div>
    </div>
  )
}
