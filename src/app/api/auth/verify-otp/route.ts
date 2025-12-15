import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { getUserByEmail, createUser as createUserService } from '@/lib/services/users';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '');

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toLowerCase().trim();
    const otp = (body?.otp || '').trim();
    const password = body?.password || null;
    const createUser = body?.createUser ?? true;
    const username = body?.username || null;
    const phone = body?.phone || null;
    const dateOfBirth = body?.dateOfBirth || null;
    const gender = body?.gender || null;
    
    if (!email || !otp) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

    // Find OTP record
    const { data: rows, error } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('used', false)
      .lte('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error('OTP fetch error', error);
      return NextResponse.json({ error: 'Failed to verify' }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const otpRow = rows[0];

    // Check if OTP is actually expired
    if (new Date(otpRow.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Verification code has expired' }, { status: 400 });
    }

    // If createUser is false, just verify the OTP without creating user or marking as used
    if (!createUser) {
      return NextResponse.json({ ok: true, verified: true });
    }

    // Find or create user using service layer
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      // User already exists
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Create user; password and profile fields required when creating
    if (!password) {
      return NextResponse.json({ error: 'Password is required to create account' }, { status: 400 });
    }
    if (!username) {
      return NextResponse.json({ error: 'Username is required to create account' }, { status: 400 });
    }
    if (!dateOfBirth) {
      return NextResponse.json({ error: 'Date of birth is required to create account' }, { status: 400 });
    }
    if (!gender) {
      return NextResponse.json({ error: 'Gender is required to create account' }, { status: 400 });
    }
    
    const password_hash = await bcrypt.hash(password, 10);

    // Use service to create user
    const user = await createUserService({
      user_id: crypto.randomUUID(),
      email,
      username,
      password_hash,
      date_of_birth: dateOfBirth,
      gender,
    });

    if (!user) {
      console.error('Failed to create user via service');
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
    }

    // Only mark OTP as used after successful user creation
    await supabaseAdmin.from('email_otps').update({ used: true }).eq('id', otpRow.id);

    // Return user id to client so the client can sign in or continue onboarding
    return NextResponse.json({ ok: true, user: { id: user.user_id, email: user.email } });
  } catch (err) {
    console.error('verify-otp error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
