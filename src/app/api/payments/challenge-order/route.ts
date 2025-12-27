import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { createOrder } from '@/lib/razorpay';
import { createPayment } from '@/lib/services/payments';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) return badRequest('Unauthorized', 401);

    const { leagueId, challengeId, startDate, endDate } = await req.json();
    if (!leagueId || !challengeId || !startDate || !endDate) {
      return badRequest('Missing required fields');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return badRequest('Invalid dates');
    }
    if (end < start) {
      return badRequest('End date must be after start date');
    }
    const days = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    const supabase = getSupabaseServiceRole();
    const { data: pricingRow, error: pricingError } = await supabase
      .from('challengepricing')
      .select('pricing_id, per_day_rate, admin_markup, tax')
      .limit(1)
      .maybeSingle();

    if (pricingError || !pricingRow) {
      console.error('pricing fetch error', pricingError);
      return badRequest('Pricing not configured');
    }

    const perDay = Number(pricingRow.per_day_rate || 0);
    const taxPercent = pricingRow.tax != null ? Number(pricingRow.tax) : 0;
    const taxMultiplier = taxPercent / 100;
    const base = days * perDay;
    const amount = base + taxMultiplier * base;
    if (!Number.isFinite(amount) || amount <= 0) {
      return badRequest('Calculated amount is invalid');
    }

    const order = await createOrder(amount, leagueId);

    await createPayment({
      user_id: session.user.id,
      league_id: leagueId,
      razorpay_order_id: order.id,
      base_amount: amount,
      platform_fee: 0,
      gst_amount: 0,
      total_amount: amount,
      currency: 'INR',
      purpose: 'other',
      description: `Challenge activation: ${challengeId}`,
      notes: {
        challengeId,
        leagueId,
        startDate,
        endDate,
        days,
        pricing_id: pricingRow.pricing_id,
        per_day_rate: perDay,
        tax_percent: taxPercent,
      },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('challenge-order error', err);
    return badRequest(err?.message || 'Failed to create order', 500);
  }
}
