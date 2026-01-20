/**
 * GET /api/leagues/[id]/my-team/summary - Get cumulative team rest days used and missed days
 *
 * Returns totals for the current user's team only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

function localYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalYmd(ymd: string): Date | null {
  const match = /^\d{4}-\d{2}-\d{2}$/.exec(String(ymd));
  if (!match) return null;
  const [y, m, d] = ymd.split('-').map((p) => Number(p));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();
    const userId = session.user.id;

    // Get league date bounds
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('league_id, start_date, end_date')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    // Get user's league membership and team
    const { data: membership, error: membershipError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, team_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
    }

    if (!membership.team_id) {
      return NextResponse.json({
        success: true,
        data: {
          teamId: null,
          memberCount: 0,
          restUsed: 0,
          missedDays: 0,
        },
      });
    }

    const teamId = membership.team_id;

    // Get all team members
    const { data: teamMembers, error: membersError } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('league_id', leagueId)
      .eq('team_id', teamId);

    if (membersError) {
      console.error('Error fetching team members:', membersError);
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    const memberIds = (teamMembers || []).map((m) => m.league_member_id);
    if (memberIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          teamId,
          memberCount: 0,
          restUsed: 0,
          missedDays: 0,
        },
      });
    }

    const todayLocal = new Date();
    const todayStr = localYmd(todayLocal);

    const leagueEndLocal = parseLocalYmd(league.end_date);
    const effectiveEndStr = leagueEndLocal && localYmd(leagueEndLocal) < todayStr
      ? localYmd(leagueEndLocal)
      : todayStr;

    // Missed days exclude today
    const yesterday = new Date(todayLocal);
    yesterday.setHours(0, 0, 0, 0);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = localYmd(yesterday);
    const missedEndStr = localYmd(parseLocalYmd(effectiveEndStr) || yesterday) < yStr
      ? effectiveEndStr
      : yStr;

    const startDt = parseLocalYmd(league.start_date);
    const missedEndDt = parseLocalYmd(missedEndStr);

    // Fetch all submissions for team members within date bounds
    const { data: entries, error: entriesError } = await supabase
      .from('effortentry')
      .select('league_member_id, date, type, status')
      .in('league_member_id', memberIds)
      .gte('date', league.start_date)
      .lte('date', effectiveEndStr);

    if (entriesError) {
      console.error('Error fetching team submissions:', entriesError);
      return NextResponse.json({ error: 'Failed to fetch team submissions' }, { status: 500 });
    }

    // Count approved rest days used for team
    const restUsed = (entries || []).filter(
      (e: any) => String(e.type).toLowerCase() === 'rest' && String(e.status).toLowerCase() === 'approved'
    ).length;

    // Build date sets per member for missed days
    const datesByMember = new Map<string, Set<string>>();
    (entries || []).forEach((e: any) => {
      const id = String(e.league_member_id);
      const dateStr = String(e.date || '');
      if (!id || !dateStr) return;
      if (!datesByMember.has(id)) datesByMember.set(id, new Set());
      datesByMember.get(id)!.add(dateStr);
    });

    let missedDays = 0;
    if (startDt && missedEndDt && startDt.getTime() <= missedEndDt.getTime()) {
      memberIds.forEach((memberId) => {
        const byDate = datesByMember.get(String(memberId)) || new Set<string>();
        const cur = new Date(startDt);
        while (cur.getTime() <= missedEndDt.getTime()) {
          const ds = localYmd(cur);
          if (!byDate.has(ds)) missedDays += 1;
          cur.setDate(cur.getDate() + 1);
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        teamId,
        memberCount: memberIds.length,
        restUsed,
        missedDays,
      },
    });
  } catch (error) {
    console.error('Error fetching team summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
