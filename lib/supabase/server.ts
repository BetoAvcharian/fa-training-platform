import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient as createSupabaseServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Nota: sin tipado generado (Database) todavía — se incorpora cuando el
// bootstrap corra `supabase gen types typescript` contra el esquema real
// (Fase 11). Hasta entonces, cada dominio tipa manualmente en su types.ts.

/**
 * Cliente para uso normal desde Server Actions / Server Components.
 * Respeta RLS — la sesión del usuario autenticado determina qué puede leer
 * y escribir. Es el cliente que usa la capa de dominio en producción.
 */
export async function createServerClient() {
  const cookieStore = await cookies()
  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Llamado desde un Server Component sin permiso de escritura
            // de cookies — seguro de ignorar, el middleware ya refresca
            // la sesión en el siguiente request.
          }
        },
      },
    }
  )
}

/** Tipo del cliente "normal" — usado para la inyección en tests (Ticket #2, revisión final). */
export type AppSupabaseClient = Awaited<ReturnType<typeof createServerClient>>

/**
 * Cliente con service_role — bypassa RLS por completo.
 * Uso EXCLUSIVO dentro de /domains/audit/mutations.ts. Nunca se importa
 * desde un componente, un Server Action directamente, ni se expone al
 * cliente del navegador. audit_logs no tiene policy de insert para ningún
 * rol de aplicación a propósito — esta es la única puerta de escritura.
 */
export function createServiceClient() {
  return createSupabaseServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
