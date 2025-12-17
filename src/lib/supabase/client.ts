import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedClient: SupabaseClient | null = null
let cachedServiceClient: SupabaseClient | null = null

/**
 * Client-side Supabase client using anon key
 * Subject to Row Level Security (RLS) policies
 */
export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars are not set')
  }
  cachedClient = createClient(supabaseUrl, supabaseAnonKey)
  return cachedClient
}

/**
 * Server-side Supabase client using service role key
 * BYPASSES Row Level Security - use ONLY for trusted server operations
 * Use cases:
 * - Authentication (login, signup) - queries happen before user is authenticated
 * - Admin operations where RLS would block legitimate actions
 * - Batch operations that need to bypass user-level permissions
 *
 * SECURITY: Never expose this client to the browser
 */
export function getSupabaseServiceRole(): SupabaseClient {
  if (typeof window !== 'undefined') {
    throw new Error('Service role client cannot be used in browser - security violation')
  }

  if (cachedServiceClient) return cachedServiceClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase service role credentials are not set')
  }

  cachedServiceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  return cachedServiceClient
}

// Lightweight helper for middleware/edge usage to avoid multiple files
export function createMiddlewareClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars are not set')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Re-export types and utilities
export * from './types'

