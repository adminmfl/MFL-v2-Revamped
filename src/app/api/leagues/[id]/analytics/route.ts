/**
 * GET /api/leagues/[id]/analytics - Get comprehensive analytics for league
 * Returns detailed analytics including health, participation, team performance, etc.
 * Cached for 10 minutes to reduce database load
 */
import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// Cache configuration: 10 minutes (600 seconds)
export const revalidate = 600;

type LeagueAnalyticsResponse = {
  leagueHealth: {
    totalMembers: number;
    activeMembers: number;
    activeMembersPercent: number;
    inactiveMembersPercent: number;
    totalTeams: number;
    daysCompleted: number;
    totalDays: number;
    leagueProgress: number;
  };
  participation: {
    dailyData: Array<{ date: string; participationRate: number; submissions: number }>;
    avgDailySubmissions: number;
  };
  topPerformers: Array<{ memberId: string; username: string; submissions: number }>;
  bottomPerformers: Array<{ memberId: string; username: string; submissions: number }>;
  teamPerformance: Array<{ teamId: string; teamName: string; size: number; rawPoints: number; avgPointsPerPlayer: number }>;
  restDayAnalytics: { totalUsed: number; avgPerMember: number };
  alerts: Array<{ type: string; message: string; teams?: string[]; users?: string[] }>;
};

const getLeagueAnalyticsCached = unstable_cache(
  async (leagueId: string): Promise<{ data: LeagueAnalyticsResponse; generatedAt: string }> => {
    const supabase = getSupabaseServiceRole();

    // Get league details
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      const err = new Error('League not found');
      (err as any).status = 404;
      throw err;
    }

    const leagueStartDate = new Date(league.start_date);
    const leagueEndDate = new Date(league.end_date);
    const totalDays = Math.max(
      0,
      Math.ceil((leagueEndDate.getTime() - leagueStartDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const daysElapsed = Math.max(
      0,
      Math.ceil((new Date().getTime() - leagueStartDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    const { count: totalMembers } = await supabase
      .from('leaguemembers')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    const { data: allMembers } = await supabase
      .from('leaguemembers')
      .select('league_member_id, user_id')
      .eq('league_id', leagueId);

    const memberIds = (allMembers || []).map((m) => m.league_member_id);

    const { count: teamCount } = await supabase
      .from('teamleagues')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    if (memberIds.length === 0) {
      return {
        generatedAt: new Date().toISOString(),
        data: {
          leagueHealth: {
            totalMembers: totalMembers || 0,
            activeMembers: 0,
            activeMembersPercent: 0,
            inactiveMembersPercent: totalMembers ? 100 : 0,
            totalTeams: teamCount || 0,
            daysCompleted: Math.min(daysElapsed, totalDays),
            totalDays,
            leagueProgress: totalDays ? Math.round((Math.min(daysElapsed, totalDays) / totalDays) * 100) : 0,
          },
          participation: {
            dailyData: [],
            avgDailySubmissions: 0,
          },
          topPerformers: [],
          bottomPerformers: [],
          teamPerformance: [],
          restDayAnalytics: {
            totalUsed: 0,
            avgPerMember: 0,
          },
          alerts: [],
        },
      };
    }

    // Active members (submitted in last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: activeSubmissions } = await supabase
      .from('effortentry')
      .select('league_member_id')
      .in('league_member_id', memberIds)
      .eq('status', 'approved')
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

    const activeMembers = new Set(activeSubmissions?.map((s) => s.league_member_id) || []).size;

    // Participation analytics
    const { data: allSubmissions } = await supabase
      .from('effortentry')
      .select('league_member_id, date, status')
      .in('league_member_id', memberIds)
      .eq('status', 'approved')
      .gte('date', league.start_date)
      .lte('date', league.end_date)
      .order('entry_date', { ascending: true });

    const submissionsByDate = new Map<string, number>();
    (allSubmissions || []).forEach((s) => {
      const date = s.date;
      submissionsByDate.set(date, (submissionsByDate.get(date) || 0) + 1);
    });

    const dailyParticipation = Array.from(submissionsByDate.entries())
      .map(([date, count]) => ({
        date,
        participationRate: Math.round((count / (totalMembers || 1)) * 100),
        submissions: count,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Top & bottom performers
    const { data: userSubmissions } = await supabase
      .from('effortentry')
      .select('league_member_id, status')
      .in('league_member_id', memberIds)
      .eq('status', 'approved');

    const submissionCounts = new Map<string, number>();
    (userSubmissions || []).forEach((s) => {
      submissionCounts.set(s.league_member_id, (submissionCounts.get(s.league_member_id) || 0) + 1);
    });

    const { data: memberDetails } = await supabase
      .from('leaguemembers')
      .select('league_member_id, user_id, users(username)')
      .in('league_member_id', memberIds);

    const performersList = (memberDetails || [])
      .map((m: any) => ({
        memberId: m.league_member_id,
        username: m.users?.username || 'Unknown',
        submissions: submissionCounts.get(m.league_member_id) || 0,
      }))
      .sort((a, b) => b.submissions - a.submissions);

    const topPerformers = performersList.slice(0, 10);
    const bottomPerformers = performersList.slice(-10).reverse();

    // Rest day analytics
    const { data: restDayRecords } = await supabase
      .from('resdays')
      .select('*')
      .in('league_member_id', memberIds);

    const totalRestDaysUsed = restDayRecords?.length || 0;
    const avgRestDaysPerMember = totalMembers ? Math.round(totalRestDaysUsed / totalMembers) : 0;

    // Team performance (existing behavior)
    const { data: teamLeagues } = await supabase
      .from('teamleagues')
      .select('team_id')
      .eq('league_id', leagueId);

    const teamIds = (teamLeagues || []).map((t: any) => t.team_id);

    const { data: teams } = teamIds.length
      ? await supabase.from('teams').select('team_id, team_name').in('team_id', teamIds)
      : { data: [] as any[] };

    const teamStats = await Promise.all(
      (teams || []).map(async (team: any) => {
        const { data: teamMembers } = await supabase
          .from('leaguemembers')
          .select('league_member_id')
          .eq('team_id', team.team_id);

        const teamMemberIds = (teamMembers || []).map((m) => m.league_member_id);

        const { data: teamSubs } = teamMemberIds.length
          ? await supabase
              .from('effortentry')
              .select('*')
              .in('league_member_id', teamMemberIds)
              .eq('status', 'approved')
          : { data: [] as any[] };

        const rawPoints = teamSubs?.length || 0;
        const teamSize = teamMemberIds.length || 1;

        return {
          teamId: team.team_id,
          teamName: team.team_name,
          size: teamSize,
          rawPoints,
          avgPointsPerPlayer: teamSize ? Math.round((rawPoints / teamSize) * 10) / 10 : 0,
        };
      })
    );

    // Alerts / anomalies
    const alerts: LeagueAnalyticsResponse['alerts'] = [];

    const lowParticipationTeams = teamStats.filter(
      (t) => (t.rawPoints / (totalDays || 1)) < (totalMembers || 1) * 0.5
    );

    if (lowParticipationTeams.length > 0) {
      alerts.push({
        type: 'warning',
        message: `${lowParticipationTeams.length} team(s) have <50% participation`,
        teams: lowParticipationTeams.map((t) => t.teamName),
      });
    }

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const { data: recentActive } = await supabase
      .from('effortentry')
      .select('league_member_id')
      .in('league_member_id', memberIds)
      .eq('status', 'approved')
      .gte('date', fourDaysAgo.toISOString().split('T')[0]);

    const recentActiveMemberIds = new Set(recentActive?.map((s) => s.league_member_id) || []);
    const inactiveUsers = performersList.filter((p) => !recentActiveMemberIds.has(p.memberId));

    if (inactiveUsers.length > 0) {
      alerts.push({
        type: 'alert',
        message: `${inactiveUsers.length} user(s) inactive for 5+ days`,
        users: inactiveUsers.slice(0, 5).map((u) => u.username),
      });
    }

    return {
      generatedAt: new Date().toISOString(),
      data: {
        leagueHealth: {
          totalMembers: totalMembers || 0,
          activeMembers,
          activeMembersPercent: totalMembers ? Math.round((activeMembers / totalMembers) * 100) : 0,
          inactiveMembersPercent: totalMembers
            ? Math.round(((totalMembers - activeMembers) / totalMembers) * 100)
            : 0,
          totalTeams: teamCount || 0,
          daysCompleted: Math.min(daysElapsed, totalDays),
          totalDays,
          leagueProgress: totalDays ? Math.round((Math.min(daysElapsed, totalDays) / totalDays) * 100) : 0,
        },
        participation: {
          dailyData: dailyParticipation,
          avgDailySubmissions: dailyParticipation.length
            ? Math.round(
                (dailyParticipation.reduce((sum, d) => sum + d.submissions, 0) / dailyParticipation.length) * 10
              ) / 10
            : 0,
        },
        topPerformers,
        bottomPerformers,
        teamPerformance: teamStats,
        restDayAnalytics: {
          totalUsed: totalRestDaysUsed,
          avgPerMember: avgRestDaysPerMember,
        },
        alerts,
      },
    };
  },
  ['league-analytics'],
  { revalidate: 600 }
);

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

    const { data, generatedAt } = await getLeagueAnalyticsCached(leagueId);

    return NextResponse.json(
      {
        success: true,
        generatedAt,
        data,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=86400',
          'CDN-Cache-Control': 'max-age=600',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching analytics:', error);
    const status = typeof (error as any)?.status === 'number' ? (error as any).status : 500;
    const message = status === 404 ? 'League not found' : 'Internal server error';
    return NextResponse.json({ error: message }, { status });
  }
}
