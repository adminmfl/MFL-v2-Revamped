/**
 * GET /api/leagues/[id]/leaderboard - Get league leaderboard data
 *
 * Returns team rankings and individual rankings for a league.
 * Supports date range filtering for custom periods.
 * Includes special challenge bonuses in team scores.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface TeamRanking {
  rank: number;
  team_id: string;
  team_name: string;
  points: number;
  challenge_bonus: number;
  total_points: number;
  avg_rr: number;
  member_count: number;
  submission_count: number;
}

export interface IndividualRanking {
  rank: number;
  user_id: string;
  username: string;
  team_id: string | null;
  team_name: string | null;
  points: number;
  avg_rr: number;
  submission_count: number;
}

export interface LeaderboardStats {
  total_submissions: number;
  approved: number;
  pending: number;
  rejected: number;
  total_rr: number;
}

// ============================================================================
// GET Handler
// ============================================================================

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

    // Get query params for date range filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Verify league exists and get its date range
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('league_id, league_name, start_date, end_date')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Use league dates as default if not provided
    const filterStartDate = startDate || league.start_date;
    const filterEndDate = endDate || new Date().toISOString().split('T')[0];

    // =========================================================================
    // Get all teams in the league
    // =========================================================================
    const { data: teams, error: teamsError } = await supabase
      .from('teamleagues')
      .select(`
        team_id,
        teams(team_id, team_name)
      `)
      .eq('league_id', leagueId);

    if (teamsError) {
      console.error('Error fetching teams:', teamsError);
      return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 });
    }

    // =========================================================================
    // Get all league members with team assignment
    // =========================================================================
    const { data: members, error: membersError } = await supabase
      .from('leaguemembers')
      .select(`
        league_member_id,
        user_id,
        team_id,
        users!leaguemembers_user_id_fkey(user_id, username)
      `)
      .eq('league_id', leagueId);

    if (membersError) {
      console.error('Error fetching members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // Create member lookup maps
    const memberIds = (members || []).map((m) => m.league_member_id);
    const memberToUser = new Map<string, { user_id: string; username: string; team_id: string | null }>();
    const teamMembers = new Map<string, string[]>(); // team_id -> league_member_ids

    (members || []).forEach((m) => {
      const user = m.users as any;
      memberToUser.set(m.league_member_id, {
        user_id: m.user_id,
        username: user?.username || 'Unknown',
        team_id: m.team_id,
      });

      if (m.team_id) {
        const existing = teamMembers.get(m.team_id) || [];
        existing.push(m.league_member_id);
        teamMembers.set(m.team_id, existing);
      }
    });

    // =========================================================================
    // Get all effort entries within date range
    // =========================================================================
    let entriesQuery = supabase
      .from('effortentry')
      .select('id, league_member_id, date, type, rr_value, status')
      .in('league_member_id', memberIds);

    if (filterStartDate) {
      entriesQuery = entriesQuery.gte('date', filterStartDate);
    }
    if (filterEndDate) {
      entriesQuery = entriesQuery.lte('date', filterEndDate);
    }

    const { data: entries, error: entriesError } = await entriesQuery;

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }

    // =========================================================================
    // Get special challenge bonuses for teams
    // =========================================================================
    let challengesQuery = supabase
      .from('specialchallengeteamscore')
      .select(`
        team_id,
        score,
        specialchallenges(challenge_id, name, end_date)
      `)
      .eq('league_id', leagueId);

    const { data: challengeScores, error: challengeError } = await challengesQuery;

    if (challengeError) {
      console.error('Error fetching challenge scores:', challengeError);
      // Continue without challenge bonuses
    }

    // Filter challenges by end_date within range and aggregate
    const teamChallengeBonus = new Map<string, number>();
    (challengeScores || []).forEach((cs) => {
      const challenge = cs.specialchallenges as any;
      if (challenge?.end_date) {
        const challengeEndDate = challenge.end_date;
        if (challengeEndDate >= filterStartDate && challengeEndDate <= filterEndDate) {
          const existing = teamChallengeBonus.get(cs.team_id) || 0;
          teamChallengeBonus.set(cs.team_id, existing + (cs.score || 0));
        }
      }
    });

    // =========================================================================
    // Calculate statistics
    // =========================================================================
    const stats: LeaderboardStats = {
      total_submissions: (entries || []).length,
      approved: (entries || []).filter((e) => e.status === 'approved').length,
      pending: (entries || []).filter((e) => e.status === 'pending').length,
      rejected: (entries || []).filter((e) => e.status === 'rejected').length,
      total_rr: (entries || [])
        .filter((e) => e.status === 'approved' && e.rr_value)
        .reduce((sum, e) => sum + (e.rr_value || 0), 0),
    };

    // =========================================================================
    // Calculate team rankings
    // =========================================================================
    const teamStats = new Map<string, {
      team_id: string;
      team_name: string;
      points: number;
      total_rr: number;
      rr_count: number;
      member_count: number;
      submission_count: number;
    }>();

    // Initialize team stats
    (teams || []).forEach((t) => {
      const team = t.teams as any;
      if (team) {
        const memberList = teamMembers.get(team.team_id) || [];
        teamStats.set(team.team_id, {
          team_id: team.team_id,
          team_name: team.team_name,
          points: 0,
          total_rr: 0,
          rr_count: 0,
          member_count: memberList.length,
          submission_count: 0,
        });
      }
    });

    // Aggregate entries by team
    (entries || []).forEach((entry) => {
      const memberInfo = memberToUser.get(entry.league_member_id);
      if (!memberInfo?.team_id) return;

      const teamStat = teamStats.get(memberInfo.team_id);
      if (!teamStat) return;

      teamStat.submission_count++;

      // Only approved entries count toward points
      if (entry.status === 'approved') {
        // 1 point per approved entry (per PRD)
        teamStat.points++;

        // Track RR values for average calculation
        if (entry.rr_value && entry.rr_value > 0) {
          teamStat.total_rr += entry.rr_value;
          teamStat.rr_count++;
        }
      }
    });

    // Convert to array and add challenge bonuses
    const teamRankings: TeamRanking[] = Array.from(teamStats.values())
      .map((ts) => {
        const challengeBonus = teamChallengeBonus.get(ts.team_id) || 0;
        return {
          rank: 0, // Will be set after sorting
          team_id: ts.team_id,
          team_name: ts.team_name,
          points: ts.points,
          challenge_bonus: challengeBonus,
          total_points: ts.points + challengeBonus,
          avg_rr: ts.rr_count > 0 ? Math.round((ts.total_rr / ts.rr_count) * 100) / 100 : 0,
          member_count: ts.member_count,
          submission_count: ts.submission_count,
        };
      })
      .sort((a, b) => {
        // Sort by total_points DESC, then avg_rr DESC
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        return b.avg_rr - a.avg_rr;
      })
      .map((team, index) => ({ ...team, rank: index + 1 }));

    // =========================================================================
    // Calculate individual rankings
    // =========================================================================
    const individualStats = new Map<string, {
      user_id: string;
      username: string;
      team_id: string | null;
      team_name: string | null;
      points: number;
      total_rr: number;
      rr_count: number;
      submission_count: number;
    }>();

    // Initialize individual stats from members
    (members || []).forEach((m) => {
      const user = m.users as any;
      const team = (teams || []).find((t) => (t.teams as any)?.team_id === m.team_id);
      const teamInfo = team?.teams as any;

      individualStats.set(m.league_member_id, {
        user_id: m.user_id,
        username: user?.username || 'Unknown',
        team_id: m.team_id,
        team_name: teamInfo?.team_name || null,
        points: 0,
        total_rr: 0,
        rr_count: 0,
        submission_count: 0,
      });
    });

    // Aggregate entries by individual
    (entries || []).forEach((entry) => {
      const individualStat = individualStats.get(entry.league_member_id);
      if (!individualStat) return;

      individualStat.submission_count++;

      if (entry.status === 'approved') {
        individualStat.points++;

        if (entry.rr_value && entry.rr_value > 0) {
          individualStat.total_rr += entry.rr_value;
          individualStat.rr_count++;
        }
      }
    });

    // Convert to array and sort
    const individualRankings: IndividualRanking[] = Array.from(individualStats.values())
      .map((is) => ({
        rank: 0,
        user_id: is.user_id,
        username: is.username,
        team_id: is.team_id,
        team_name: is.team_name,
        points: is.points,
        avg_rr: is.rr_count > 0 ? Math.round((is.total_rr / is.rr_count) * 100) / 100 : 0,
        submission_count: is.submission_count,
      }))
      .sort((a, b) => {
        // Sort by points DESC, then avg_rr DESC
        if (b.points !== a.points) return b.points - a.points;
        return b.avg_rr - a.avg_rr;
      })
      .map((individual, index) => ({ ...individual, rank: index + 1 }))
      .slice(0, 50); // Limit to top 50

    // =========================================================================
    // Return response
    // =========================================================================
    return NextResponse.json({
      success: true,
      data: {
        teams: teamRankings,
        individuals: individualRankings,
        stats,
        dateRange: {
          startDate: filterStartDate,
          endDate: filterEndDate,
        },
        league: {
          league_id: league.league_id,
          league_name: league.league_name,
          start_date: league.start_date,
          end_date: league.end_date,
        },
      },
    });
  } catch (error) {
    console.error('Error in leaderboard GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
