import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { getSupabaseServiceRole } from '@/lib/supabase/client'
import bcrypt from 'bcryptjs'
import { isRateLimited } from '@/lib/rateLimiter'

const SECRET = process.env.NEXTAUTH_SECRET

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
    if (isRateLimited(`update-password:${ip}`, 8, 60_000)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const body = await req.json()
    const { currentPassword, newPassword } = body || {}

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const token = await getToken({ req, secret: SECRET })
    if (!token || !token.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use service role to bypass RLS (user is authenticated via JWT, not Supabase auth)
    const supabase = getSupabaseServiceRole()
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('user_id', token.id)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const stored = (user as any).password_hash
    if (!stored) {
      return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 })
    }

    const match = await bcrypt.compare(String(currentPassword), String(stored))
    if (!match) {
      return NextResponse.json({ error: 'Current password incorrect' }, { status: 400 })
    }

    const hashed = await bcrypt.hash(String(newPassword), 10)
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashed })
      .eq('user_id', token.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('update-password error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
