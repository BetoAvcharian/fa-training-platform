'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="text-sm text-white/50 hover:text-white text-left px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors"
    >
      Cerrar sesión
    </button>
  )
}
