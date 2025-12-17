import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '../../../../lib/mailer';
import { rateLimitEmailAndIP } from '../../../../lib/rateLimiter';
import { validateMailerEnv, validateSupabaseEnv } from '../../../../lib/env';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.warn('Supabase URL or service key missing; send-otp will fail if DB write is attempted.');
}

const supabaseAdmin = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = (body?.email || '').toLowerCase().trim();
    if (!email) return NextResponse.json({ error: 'Missing email' }, { status: 400 });

    // validate envs (warn if missing)
    validateMailerEnv();
    validateSupabaseEnv();

    // rate limit by email and IP
    const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '').split(',')[0].trim() || 'unknown';
    const { emailRes, ipRes } = await rateLimitEmailAndIP(email, ip);
    if (!emailRes.allowed) {
      return NextResponse.json({ error: 'Too many requests for this email. Try again later.' }, { status: 429 });
    }
    if (!ipRes.allowed) {
      return NextResponse.json({ error: 'Too many requests from this IP. Try again later.' }, { status: 429 });
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Store OTP in email_otps table
    const { data, error } = await supabaseAdmin.from('email_otps').insert([{ email, otp, expires_at: expiresAt, used: false }]);
    if (error) {
      console.error('Failed to insert OTP:', error);
      const message = process.env.NODE_ENV === 'production' ? 'Failed to create OTP' : `Failed to create OTP: ${error.message || JSON.stringify(error)}`;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // Send email
    const subject = 'Your verification code for MFL';
    const html = `<p>Your verification code is <strong>${otp}</strong>. It expires in 10 minutes.</p>`;
    try {
      await sendEmail(email, subject, html, `Your verification code is ${otp}`);
    } catch (mailErr: any) {
      console.error('Failed to send OTP email:', mailErr);
      const message = process.env.NODE_ENV === 'production' ? 'Failed to send OTP email' : `Failed to send OTP email: ${mailErr?.message || String(mailErr)}`;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('send-otp error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
