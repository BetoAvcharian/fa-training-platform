'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updatePhotoAction } from './actions'

export function AvatarUpload({ initialUrl, initials }: { initialUrl: string | null; initials: string }) {
  const [url, setUrl] = useState(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError('No autenticado')
        setUploading(false)
        return
      }

      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadError) {
        setError(uploadError.message)
        setUploading(false)
        return
      }
      const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path)

      startTransition(async () => {
        const result = await updatePhotoAction(publicUrl.publicUrl)
        if (result?.error) setError(result.error)
        else setUrl(publicUrl.publicUrl)
        setUploading(false)
      })
    } catch {
      setError('No se pudo subir la foto')
      setUploading(false)
    }
  }

  const busy = uploading || pending

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full bg-navy/10 flex items-center justify-center overflow-hidden shrink-0">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Foto de perfil" className="w-full h-full object-cover" />
        ) : (
          <span className="text-navy font-display font-bold text-lg">{initials}</span>
        )}
      </div>
      <label className="btn-secondary px-3 py-1.5 text-xs cursor-pointer">
        {busy ? 'Subiendo…' : 'Cambiar foto'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </label>
      {error && <p className="text-xs text-status-critical">{error}</p>}
    </div>
  )
}
