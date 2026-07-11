import { createBrowserClient } from '@supabase/ssr'

/**
 * Únicamente para el login (donde necesitamos supabase.auth desde el
 * navegador). Ningún dato de dominio se lee/escribe con este cliente —
 * eso sigue siendo exclusivo de /domains/*, tal como fijamos en la Fase
 * 11. Esta es la única excepción consciente a "el cliente nunca conoce
 * Supabase": la sesión de auth en sí no es un dato de dominio.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
