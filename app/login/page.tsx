import { loginAction } from './actions'
import { Logo } from '@/components/logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface">
      {/* Panel de identidad — deportivo, alto rendimiento. Solo visible desde tablet/desktop en full, en mobile queda como banda superior. */}
      <div className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-[#0F2A52] text-white px-8 py-10 lg:w-[46%] lg:py-16 lg:px-14 flex flex-col justify-between">
        {/* Líneas de pista/velocidad, puramente decorativas */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" preserveAspectRatio="none" viewBox="0 0 400 800">
          {[80, 180, 280, 380, 480, 580, 680, 780].map((y) => (
            <line key={y} x1="-100" y1={y} x2="500" y2={y - 160} stroke="white" strokeWidth="3" />
          ))}
        </svg>

        <div className="relative">
          <Logo className="w-12 h-12 mb-6" />
          <h1 className="font-display text-4xl lg:text-5xl font-bold leading-[1.05]">
            Entrenamiento
            <br />
            de alto
            <br />
            <span className="text-gold">rendimiento.</span>
          </h1>
          <p className="text-white/70 mt-4 text-sm lg:text-base max-w-xs">
            Planificación, seguimiento y resultados de tus atletas, todo en un solo lugar.
          </p>
        </div>

        <div className="relative hidden lg:flex flex-col gap-3 mt-10">
          {[
            ['🎯', 'Objetivos y planificación de temporada'],
            ['🏆', 'Puntaje World Athletics automático'],
            ['📈', 'Evolución y comparación entre atletas'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3 text-sm text-white/80">
              <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">{icon}</span>
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Formulario */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 relative">
        <ThemeToggle className="absolute top-4 right-4 text-xl" />
        <form action={loginAction} className="w-full max-w-sm space-y-4">
          <div className="mb-2">
            <h2 className="font-display text-2xl font-bold text-ink">Ingresar</h2>
            <p className="text-sm text-status-neutral mt-1">Entrá con tu cuenta de ENTRENAME.</p>
          </div>

          <div>
            <label className="block text-xs text-status-neutral mb-1">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg border border-outline bg-panel text-ink px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div>
            <label className="block text-xs text-status-neutral mb-1">Contraseña</label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-lg border border-outline bg-panel text-ink px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {params.error && <p className="text-sm text-status-critical">Email o contraseña incorrectos</p>}

          <button type="submit" className="w-full btn-primary py-2.5 text-sm">
            Ingresar
          </button>

          <p className="text-center text-xs text-status-neutral">
            ¿No tenés cuenta? <a href="/signup" className="text-ink underline">Creá una</a>
          </p>
        </form>
      </div>
    </div>
  )
}
