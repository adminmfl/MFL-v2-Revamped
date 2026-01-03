import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { z } from 'zod';

import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { userHasAnyRole } from '@/lib/services/roles';

const querySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id: leagueId, memberId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();
    const canManage = await userHasAnyRole(session.user.id, leagueId, ['host', 'governor']);
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const qs = Object.fromEntries(new URL(request.url).searchParams.entries());
    const parsed = querySchema.safeParse(qs);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query params', details: parsed.error.flatten() }, { status: 400 });
    }

    const { startDate, endDate } = parsed.data;

    // Ensure member belongs to league
    const { data: member, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_id, league_member_id')
      .eq('league_member_id', memberId)
      .single();

    if (memberError || !member || member.league_id !== leagueId) {
      return NextResponse.json({ error: 'Member not found in this league' }, { status: 404 });
    }

    let query = supabase
      .from('effortentry')
      .select('*')
      .eq('league_member_id', memberId)
      .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('member entries GET failed', error);
      return NextResponse.json({ error: 'Failed to fetch entries' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { entries: data || [] } });
  } catch (error) {
    console.error('member entries GET unexpected', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
