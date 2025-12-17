/**
 * POST /api/payments/verify
 * Verifies Razorpay payment signature and updates payment status
 * Also updates the league status to 'launched' after successful payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { updatePaymentStatus } from '@/lib/services/payments';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentId, signature } = await req.json();

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify signature
    const isValid = verifyPaymentSignature(orderId, paymentId, signature);
    if (!isValid) {
      // Update payment as failed
      await updatePaymentStatus(orderId, paymentId, signature, 'failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Update payment status to completed
    const payment = await updatePaymentStatus(orderId, paymentId, signature, 'completed');

    // Update league status to 'launched' after successful payment
    if (payment.league_id) {
      const supabase = getSupabaseServiceRole();
      const { error: leagueError } = await supabase
        .from('leagues')
        .update({
          status: 'launched',
          modified_date: new Date().toISOString(),
        })
        .eq('league_id', payment.league_id)
        .eq('status', 'draft'); // Only update if still in draft

      if (leagueError) {
        console.error('Error updating league status:', leagueError);
      }
    }

    return NextResponse.json({
      success: true,
      payment: {
        payment_id: payment.payment_id,
        status: payment.status,
        league_id: payment.league_id,
      },
    });
  } catch (err: any) {
    console.error('Payment verification error:', err);
    return NextResponse.json(
      { error: err.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}
