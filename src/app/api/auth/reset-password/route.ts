import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { isRateLimited } from '@/lib/rateLimiter';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_KEY || '');

export async function POST(req: Request) {
    try {
        const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').split(',')[0].trim();
        if (isRateLimited(`reset-password:${ip}`, 5, 60_000)) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const body = await req.json();
        const email = (body?.email || '').toLowerCase().trim();
        const otp = (body?.otp || '').trim();
        const newPassword = body?.password || '';

        if (!email || !otp || !newPassword) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify OTP
        const { data: rows, error: otpError } = await supabaseAdmin
            .from('email_otps')
            .select('*')
            .eq('email', email)
            .eq('otp', otp)
            .eq('used', false)
            .lte('expires_at', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()); // Ensure not wildly future dated if logic changes, but mostly we check > now

        if (otpError) {
            console.error('OTP check error', otpError);
            return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
        }

        const validOtp = rows?.find(r => new Date(r.expires_at) > new Date());
        if (!validOtp) {
            return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
        }

        // Get user
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('user_id')
            .eq('email', email)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update password
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('user_id', user.user_id);

        if (updateError) {
            console.error('Password update error', updateError);
            return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
        }

        // Mark OTP as used
        await supabaseAdmin
            .from('email_otps')
            .update({ used: true })
            .eq('id', validOtp.id);

        return NextResponse.json({ ok: true });

    } catch (err) {
        console.error('reset-password error', err);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
