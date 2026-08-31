import { redirect } from 'next/navigation'
import { getMyActiveMemberships } from '@/domains/athletes/queries'
import { Logo } from '@/components/logo'
import { chooseProfileAction } from './actions'

const ROLE_LABELS: Record<string, string> = {
  manager: 'Manager',
  coach: 'Entrenador',
  athlete: 'Atleta',
}
const ROLE_ICONS: Record<string, string> = {
  manager: '🏛️',
  coach: '📋',
  athlete: '🏃',
}

export default async function ElegirPerfilPage() {
  const options = await getMyActiveMemberships()

  // Si por algún motivo llega acá con 0 o 1 perfil, no tiene nada que
  // elegir — para el root page ya lo manda directo, esto es un resguardo.
  if (options.length <= 1) redirect('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <Logo className="w-12 h-12 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-ink">¿Con qué perfil entrás?</h1>
          <p className="text-sm text-status-neutral mt-1">Tenés más de un perfil activo con este mail.</p>
        </div>

        <div className="space-y-3">
          {options.map((o) => (
            <form key={o.id} action={chooseProfileAction}>
              <input type="hidden" name="membershipId" value={o.id} />
              <button type="submit" className="w-full card-hover p-4 flex items-center gap-3 text-left">
                <span className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center text-lg shrink-0">
                  {ROLE_ICONS[o.role] ?? '👤'}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-ink">{ROLE_LABELS[o.role] ?? o.role}</p>
                  <p className="text-xs text-status-neutral truncate">{o.organizationName}</p>
                </div>
                <span className="ml-auto text-navy shrink-0">→</span>
              </button>
            </form>
          ))}
        </div>

        <p className="text-center text-xs text-status-neutral">
          Podés cambiar de perfil cuando quieras cerrando sesión y volviendo a elegir.
        </p>
      </div>
    </div>
  )
}
