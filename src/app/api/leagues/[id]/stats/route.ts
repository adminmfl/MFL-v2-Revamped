/**
 * GET /api/leagues/[id]/stats - Get league statistics
 * Returns real-time stats for the league dashboard
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    // Get league to verify it exists
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('league_id, num_teams, team_size')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from('leaguemembers')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    // Get team count via teamleagues junction table
    const { count: teamCount } = await supabase
      .from('teamleagues')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    // Get league member IDs for this league
    const { data: leagueMembers } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('league_id', leagueId);

    const memberIds = (leagueMembers || []).map((m) => m.league_member_id);

    if (memberIds.length === 0) {
      // No members, return zeros
      return NextResponse.json({
        success: true,
        stats: {
          totalPoints: 0,
          memberCount: 0,
          teamCount: teamCount || 0,
          submissionCount: 0,
          pendingCount: 0,
          activeMembers: 0,
          dailyAverage: 0,
          maxCapacity: (league.num_teams || 0) * (league.team_size || 0),
        },
      });
    }

    // Get total submissions from effortentry table
    const { count: submissionCount } = await supabase
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .in('league_member_id', memberIds);

    // Get approved submissions count (1 point per approved entry per PRD)
    const { count: approvedCount } = await supabase
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .in('league_member_id', memberIds)
      .eq('status', 'approved');

    const totalPoints = approvedCount || 0;

    // Get pending submissions count
    const { count: pendingCount } = await supabase
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .in('league_member_id', memberIds)
      .eq('status', 'pending');

    // Calculate active members (members who have submitted in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentSubmissions } = await supabase
      .from('effortentry')
      .select('league_member_id')
      .in('league_member_id', memberIds)
      .gte('created_date', sevenDaysAgo.toISOString());

    const activeMembers = new Set((recentSubmissions || []).map(e => e.league_member_id)).size;

    // Calculate daily average (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: last30DaysSubmissions } = await supabase
      .from('effortentry')
      .select('*', { count: 'exact', head: true })
      .in('league_member_id', memberIds)
      .gte('created_date', thirtyDaysAgo.toISOString());

    const dailyAverage = ((last30DaysSubmissions || 0) / 30).toFixed(1);

    return NextResponse.json({
      success: true,
      stats: {
        totalPoints,
        memberCount: memberCount || 0,
        teamCount: teamCount || 0,
        submissionCount: submissionCount || 0,
        pendingCount: pendingCount || 0,
        activeMembers,
        dailyAverage: parseFloat(dailyAverage),
        maxCapacity: (league.num_teams || 0) * (league.team_size || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching league stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch league stats' },
      { status: 500 }
    );
  }
}
