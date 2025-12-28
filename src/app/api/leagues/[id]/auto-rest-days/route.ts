/**
 * POST /api/leagues/[id]/auto-rest-days
 *
 * Auto-assign missed past days as Rest Days (RR=1, 1 point) up to the league's
 * weekly rest-day allowance. Weeks run Sunday → Saturday.
 *
 * This endpoint is intended to support UI views (e.g. last-7-days tracking)
 * that need the same behavior as the player dashboard.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

function isYmd(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const DAY_MS = 24 * 60 * 60 * 1000;

function ymdToUtcMsAtLocalMidnight(ymd: string, tzOffsetMinutes: number): number {
  const [y, m, d] = ymd.split('-').map((p) => Number(p));
  // Local midnight (in the client's timezone) corresponds to UTC midnight + offset.
  return Date.UTC(y, m - 1, d) + tzOffsetMinutes * 60_000;
}

function utcMsAtLocalMidnightToYmd(utcMsAtLocalMidnight: number, tzOffsetMinutes: number): string {
  // Convert local-midnight instant to its local calendar date by reversing the offset.
  const dt = new Date(utcMsAtLocalMidnight - tzOffsetMinutes * 60_000);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function weekStartSundayYmd(ymd: string, tzOffsetMinutes: number): string {
  const utcMs = ymdToUtcMsAtLocalMidnight(ymd, tzOffsetMinutes);
  const dayOfWeek = new Date(utcMs).getUTCDay(); // 0=Sun..6=Sat for client's local midnight
  const startUtcMs = utcMs - dayOfWeek * DAY_MS;
  return utcMsAtLocalMidnightToYmd(startUtcMs, tzOffsetMinutes);
}

function addDaysYmd(ymd: string, days: number, tzOffsetMinutes: number): string {
  const utcMs = ymdToUtcMsAtLocalMidnight(ymd, tzOffsetMinutes);
  return utcMsAtLocalMidnightToYmd(utcMs + days * DAY_MS, tzOffsetMinutes);
}

function uniqueSortedYmd(values: string[]): string[] {
  const uniq = Array.from(new Set(values));
  uniq.sort();
  return uniq;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const datesRaw: unknown = body?.dates;
    const tzOffsetMinutesRaw: unknown = body?.tzOffsetMinutes;

    const tzOffsetMinutes =
      typeof tzOffsetMinutesRaw === 'number' && Number.isFinite(tzOffsetMinutesRaw)
        ? tzOffsetMinutesRaw
        : 0;

    if (!Array.isArray(datesRaw)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const requestedDates = uniqueSortedYmd(datesRaw.filter(isYmd));
    if (requestedDates.length === 0) {
      return NextResponse.json({ success: true, data: { assignedDates: [], skippedDates: [] } });
    }

    const supabase = getSupabaseServiceRole();
    const userId = session.user.id;

    // Verify membership and get league_member_id
    const { data: leagueMember, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (memberError) {
      return NextResponse.json({ error: 'Failed to verify membership' }, { status: 500 });
    }

    if (!leagueMember?.league_member_id) {
      return NextResponse.json({ error: 'You are not a member of this league' }, { status: 403 });
    }

    const leagueMemberId = leagueMember.league_member_id as string;

    // Get league rest-days-per-week allowance
    const { data: leagueRow, error: leagueError } = await supabase
      .from('leagues')
      .select('start_date,end_date,rest_days')
      .eq('league_id', leagueId)
      .single();

    if (leagueError || !leagueRow) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    const weeklyAllowance = typeof leagueRow.rest_days === 'number' ? leagueRow.rest_days : Number(leagueRow.rest_days || 0);
    if (!Number.isFinite(weeklyAllowance) || weeklyAllowance <= 0) {
      return NextResponse.json({ success: true, data: { assignedDates: [], skippedDates: requestedDates } });
    }

    const leagueStart = String(leagueRow.start_date);
    const leagueEnd = String(leagueRow.end_date);

    // Only allow dates within the league window.
    const filteredDates = requestedDates.filter((d) => d >= leagueStart && d <= leagueEnd);
    if (filteredDates.length === 0) {
      return NextResponse.json({ success: true, data: { assignedDates: [], skippedDates: requestedDates } });
    }

    // Only auto-assign for dates strictly before "today" in the client's timezone.
    const nowLocal = new Date(Date.now() - tzOffsetMinutes * 60_000);
    const todayLocalYmd = `${nowLocal.getFullYear()}-${String(nowLocal.getMonth() + 1).padStart(2, '0')}-${String(
      nowLocal.getDate()
    ).padStart(2, '0')}`;

    const candidateDates = filteredDates.filter((d) => d < todayLocalYmd);
    if (candidateDates.length === 0) {
      return NextResponse.json({ success: true, data: { assignedDates: [], skippedDates: requestedDates } });
    }

    // Determine the full date range needed to correctly count rest days already taken in each week.
    const weekStarts = uniqueSortedYmd(candidateDates.map((d) => weekStartSundayYmd(d, tzOffsetMinutes)));
    const minWeekStart = weekStarts[0]!;
    const maxWeekStart = weekStarts[weekStarts.length - 1]!;
    const maxWeekEnd = addDaysYmd(maxWeekStart, 6, tzOffsetMinutes);

    const { data: existingEntries, error: entriesError } = await supabase
      .from('effortentry')
      .select('date,type,status')
      .eq('league_member_id', leagueMemberId)
      .gte('date', minWeekStart)
      .lte('date', maxWeekEnd);

    if (entriesError) {
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }

    const entries = (existingEntries || []) as Array<{ date: string; type: string | null; status: string | null }>;
    const hasEntryOnDate = new Set(entries.map((e) => String(e.date)));

    // Track weekly rest usage (treat pending/approved as consuming the allowance; rejected does not).
    const weeklyRestUsed = new Map<string, number>();
    for (const e of entries) {
      if (String(e.type) !== 'rest') continue;
      if (String(e.status) === 'rejected') continue;
      const weekStart = weekStartSundayYmd(String(e.date), tzOffsetMinutes);
      weeklyRestUsed.set(weekStart, (weeklyRestUsed.get(weekStart) ?? 0) + 1);
    }

    const assignedDates: string[] = [];
    const skippedDates: string[] = [];

    // Assign in chronological order, but enforce weekly caps.
    for (const d of candidateDates) {
      if (hasEntryOnDate.has(d)) {
        skippedDates.push(d);
        continue;
      }

      const wk = weekStartSundayYmd(d, tzOffsetMinutes);
      const used = weeklyRestUsed.get(wk) ?? 0;
      if (used >= weeklyAllowance) {
        skippedDates.push(d);
        continue;
      }

      const { error: rpcError } = await supabase.rpc('rfl_upsert_rest_day', {
        p_user_id: userId,
        p_date: d,
        p_team_id: null,
        p_status: 'approved',
      });

      if (rpcError) {
        // Best-effort: don't fail whole request if one day can't be assigned.
        skippedDates.push(d);
        continue;
      }

      assignedDates.push(d);
      hasEntryOnDate.add(d);
      weeklyRestUsed.set(wk, used + 1);
    }

    return NextResponse.json({
      success: true,
      data: {
        assignedDates,
        skippedDates,
      },
    });
  } catch (error) {
    console.error('Error in auto-rest-days POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
