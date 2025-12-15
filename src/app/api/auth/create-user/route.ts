import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSupabaseServiceRole } from '@/lib/supabase/client'
import { isRateLimited } from '@/lib/rateLimiter'

export async function POST(req: NextRequest) {
  try {
    // Basic rate limiting by IP to reduce abuse (in-memory for dev)
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
    if (isRateLimited(`create-user:${ip}`, 6, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const body = await req.json()
    const { email, password, username } = body || {}

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Use service role to bypass RLS during user creation
    const supabase = getSupabaseServiceRole()

    // Check email uniqueness
    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', String(email).toLowerCase())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const safeUsername = (username || String(email).split('@')[0]).toLowerCase()
    const hashed = await bcrypt.hash(String(password), 10)

    const { data, error } = await supabase
      .from('users')
      .insert({
        username: safeUsername,
        email: String(email).toLowerCase(),
        password_hash: hashed,
        is_active: true,
      })
      .select('user_id, username, email')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, user: data })
  } catch (err) {
    console.error('create-user error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
