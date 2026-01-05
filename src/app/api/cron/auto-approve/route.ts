/**
 * POST /api/cron/auto-approve - Auto-approve pending submissions after 48 hours
 *
 * This cron job runs hourly to automatically approve workout submissions
 * that have been pending for more than 48 hours (per PRD requirement).
 *
 * Security: Validates CRON_SECRET header from Vercel
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// Configuration
// ============================================================================

const AUTO_APPROVE_HOURS = 48;

// ============================================================================
// GET Handler (Vercel Cron natively uses GET)
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized cron attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    // Calculate the cutoff timestamp (48 hours ago)
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - AUTO_APPROVE_HOURS);
    const cutoffISO = cutoffDate.toISOString();

    // Find all pending submissions older than 48 hours
    const { data: pendingEntries, error: fetchError } = await supabase
      .from('effortentry')
      .select('id, league_member_id, date, created_date')
      .eq('status', 'pending')
      .lt('created_date', cutoffISO);

    if (fetchError) {
      console.error('Error fetching pending entries:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch pending entries' },
        { status: 500 }
      );
    }

    if (!pendingEntries || pendingEntries.length === 0) {
      console.log('No entries to auto-approve');
      return NextResponse.json({
        success: true,
        message: 'No entries to auto-approve',
        count: 0,
      });
    }

    // Get the IDs of entries to auto-approve
    const entryIds = pendingEntries.map((entry) => entry.id);

    // Update all pending entries to approved
    const { data: updatedEntries, error: updateError } = await supabase
      .from('effortentry')
      .update({
        status: 'approved',
        modified_by: null, // System auto-approval (no user)
        modified_date: new Date().toISOString(),
      })
      .in('id', entryIds)
      .select('id');

    if (updateError) {
      console.error('Error auto-approving entries:', updateError);
      return NextResponse.json(
        { error: 'Failed to auto-approve entries' },
        { status: 500 }
      );
    }

    const approvedCount = updatedEntries?.length || 0;
    console.log(`Auto-approved ${approvedCount} entries`);

    return NextResponse.json({
      success: true,
      message: `Auto-approved ${approvedCount} submissions`,
      count: approvedCount,
      entryIds: entryIds,
    });
  } catch (error) {
    console.error('Error in auto-approve cron:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
