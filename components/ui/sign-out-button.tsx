import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

async function signOutAction() {
  'use server'
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="text-sm text-white/50 hover:text-white text-left px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors w-full"
      >
        Cerrar sesión
      </button>
    </form>
  )
}
