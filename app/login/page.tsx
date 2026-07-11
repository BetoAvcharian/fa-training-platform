import { loginAction } from './actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <form action={loginAction} className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 space-y-4">
        <div className="text-center mb-2">
          <h1 className="font-display text-2xl font-bold text-navy">ENTRENAME</h1>
          <p className="text-sm text-status-neutral mt-1">Rendimiento para atletismo</p>
        </div>

        <div>
          <label className="block text-xs text-status-neutral mb-1">Email</label>
          <input
            type="email"
            name="email"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        <div>
          <label className="block text-xs text-status-neutral mb-1">Contraseña</label>
          <input
            type="password"
            name="password"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
          />
        </div>

        {params.error && <p className="text-sm text-status-critical">Email o contraseña incorrectos</p>}

        <button
          type="submit"
          className="w-full bg-navy text-white rounded-lg py-2.5 text-sm font-medium"
        >
          Ingresar
        </button>
      </form>
    </div>
  )
}
