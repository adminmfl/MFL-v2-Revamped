import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createMiddlewareClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase env vars are not set')
  }
  
  // For middleware, we can use a simple client
  // If you need SSR cookie handling, install @supabase/ssr package
  return createClient(supabaseUrl, supabaseAnonKey)
}

