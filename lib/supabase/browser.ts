import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

/**
 * Supabase client dengan ANON KEY untuk browser.
 * Hanya bisa akses data sesuai RLS policy.
 * Singleton agar tidak buat instance baru setiap render.
 */
export function getBrowserSupabase() {
  // Hanya boleh dipanggil di browser, bukan di server/build time
  if (typeof window === 'undefined') {
    throw new Error('getBrowserSupabase hanya bisa dipanggil di browser.')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase env vars belum diset. Isi .env.local terlebih dahulu.')
  }
  if (!client) {
    client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return client
}
