import { getPublicCoachDirectory } from '@/domains/athletes/queries'
import { SignupForm } from './signup-form'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; error?: string }>
}) {
  const params = await searchParams
  const coaches = await getPublicCoachDirectory()

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-8">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold text-navy">Crear cuenta</h1>
          <p className="text-sm text-status-neutral mt-1">ENTRENAME</p>
        </div>

        <SignupForm coaches={coaches} defaultRole={params.role} errorMessage={params.error} />

        <p className="text-center text-xs text-status-neutral mt-4">
          ¿Ya tenés cuenta? <a href="/login" className="text-navy underline">Ingresá acá</a>
        </p>
      </div>
    </div>
  )
}
