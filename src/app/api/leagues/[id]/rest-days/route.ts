/**
 * REST API for Rest Day Statistics
 * GET: Returns rest day usage and limits for the current user in a league
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { differenceInWeeks, parseISO, isWithinInterval } from 'date-fns';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = await getServerSession(authOptions as any);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();

    // Get league info (for rest_days config and dates)
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('league_id, league_name, start_date, end_date, rest_days')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Get user's league membership
    const { data: membership, error: membershipError } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
    }

    // Treat rest_days as total allowed rest days (previously per-week)
    const totalAllowedRestDays = league.rest_days ?? 1;

    // Count rest days used (approved only)
    const { count: approvedRestDays, error: approvedError } = await supabase
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .eq('league_member_id', membership.league_member_id)
      .eq('type', 'rest')
      .eq('status', 'approved');

    if (approvedError) {
      console.error('Error counting approved rest days:', approvedError);
      return NextResponse.json({ error: 'Failed to fetch rest day stats' }, { status: 500 });
    }

    // Count pending rest days (not yet approved)
    const { count: pendingRestDays, error: pendingError } = await supabase
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .eq('league_member_id', membership.league_member_id)
      .eq('type', 'rest')
      .eq('status', 'pending');

    if (pendingError) {
      console.error('Error counting pending rest days:', pendingError);
    }

    // Count exemption requests (rest days submitted after limit reached)
    // These are identified by having 'EXEMPTION_REQUEST' in notes
    const { count: exemptionRequests, error: exemptionError } = await supabase
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .eq('league_member_id', membership.league_member_id)
      .eq('type', 'rest')
      .eq('status', 'pending')
      .ilike('notes', '%EXEMPTION_REQUEST%');

    const usedRestDays = approvedRestDays || 0;
    const remainingRestDays = Math.max(0, totalAllowedRestDays - usedRestDays);
    const isAtLimit = usedRestDays >= totalAllowedRestDays;

    return NextResponse.json({
      success: true,
      data: {
        totalAllowed: totalAllowedRestDays,
        used: usedRestDays,
        pending: pendingRestDays || 0,
        remaining: remainingRestDays,
        isAtLimit,
        exemptionsPending: exemptionRequests || 0,
      },
    });
  } catch (error) {
    console.error('Error in rest-days API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
