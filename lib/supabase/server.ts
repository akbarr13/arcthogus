import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client dengan SERVICE ROLE KEY.
 * - Bypass semua RLS
 * - WAJIB digunakan HANYA di server (API routes, Server Components)
 * - JANGAN pernah import file ini di client components ('use client')
 */
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
