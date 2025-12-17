/**
 * POST /api/payments/order
 * Creates a Razorpay order for league payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOrder } from '@/lib/razorpay';
import { createPayment } from '@/lib/services/payments';
import { getPricing, calculateTotal } from '@/lib/services/pricing';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leagueId } = await req.json();
    if (!leagueId) {
      return NextResponse.json({ error: 'League ID is required' }, { status: 400 });
    }

    // Get current pricing
    const pricing = await getPricing();
    if (!pricing) {
      return NextResponse.json({ error: 'Pricing not configured' }, { status: 500 });
    }

    // Calculate amounts
    const { subtotal, gst, total } = calculateTotal(
      pricing.base_price,
      pricing.platform_fee,
      pricing.gst_percentage
    );

    // Create Razorpay order
    const order = await createOrder(total, leagueId);

    // Save payment record
    await createPayment({
      user_id: session.user.id,
      league_id: leagueId,
      razorpay_order_id: order.id,
      base_amount: pricing.base_price,
      platform_fee: pricing.platform_fee,
      gst_amount: gst,
      total_amount: total,
      purpose: 'league_creation',
      description: `Payment for league creation`,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
