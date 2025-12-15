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

    // Get team count
    const { count: teamCount } = await supabase
      .from('teams')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    // Get total submissions
    const { count: submissionCount } = await supabase
      .from('efforts')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    // Get approved submissions for total points
    const { data: approvedEfforts } = await supabase
      .from('efforts')
      .select('points')
      .eq('league_id', leagueId)
      .eq('status', 'approved');

    const totalPoints = (approvedEfforts || []).reduce(
      (sum, e) => sum + (Number(e.points) || 0),
      0
    );

    // Get pending submissions count
    const { count: pendingCount } = await supabase
      .from('efforts')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .eq('status', 'pending');

    // Calculate active members (members who have submitted in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeSubmitters } = await supabase
      .from('efforts')
      .select('submitted_by')
      .eq('league_id', leagueId)
      .gte('created_date', sevenDaysAgo.toISOString());

    const activeMembers = new Set((activeSubmitters || []).map(e => e.submitted_by)).size;

    // Calculate daily average (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: last30DaysSubmissions } = await supabase
      .from('efforts')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
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
