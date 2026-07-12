import { getMyProfile } from '@/domains/athletes/queries'
import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function signOutAction() {
  'use server'
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  coach: 'Entrenador',
  athlete: 'Atleta',
}

export default async function PerfilPage() {
  const profile = await getMyProfile()
  if (!profile) return null

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold font-medium">Perfil</p>
        <h1 className="font-display text-2xl font-bold text-navy">
          {profile.firstName} {profile.lastName}
        </h1>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
        <div>
          <p className="text-xs text-status-neutral">Email</p>
          <p className="text-sm text-navy">{profile.email}</p>
        </div>
        <div>
          <p className="text-xs text-status-neutral">Rol</p>
          <p className="text-sm text-navy">{ROLE_LABELS[profile.role] ?? profile.role}</p>
        </div>
        <div>
          <p className="text-xs text-status-neutral">Organización</p>
          <p className="text-sm text-navy">{profile.organizationName}</p>
        </div>
        {profile.coachName && (
          <div>
            <p className="text-xs text-status-neutral">Entrenador</p>
            <p className="text-sm text-navy">{profile.coachName}</p>
          </div>
        )}
      </div>

      <a href="/mis-objetivos" className="block rounded-2xl border border-gray-100 bg-white p-4 shadow-sm text-sm text-navy">
        Mis objetivos →
      </a>

      <form action={signOutAction} className="rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
        <button type="submit" className="w-full text-left px-3 py-2.5 rounded-lg text-status-critical text-sm">
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
