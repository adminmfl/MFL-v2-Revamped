/**
 * POST /api/leagues/join-by-code - Join a league using an invite code
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
// Note: we insert membership using service role to bypass RLS for invited users

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await request.json();
    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    const normalizedCode = code.replace(/\s+/g, '').toUpperCase();
    if (!normalizedCode) {
      return NextResponse.json(
        { error: 'Invite code is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRole();

    // Find league by invite_code (no embedded join)
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .ilike('invite_code', normalizedCode)
      .single();

    if (leagueError || !league) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    // Check if league is open for joining (draft or launched)
    if (league.status === 'completed') {
      return NextResponse.json(
        { error: 'This league has ended' },
        { status: 400 }
      );
    }

    // Determine max capacity
    // 1. Frozen tier snapshot (preserved at creation)
    // 2. Default (40)
    let maxCapacity = 40;

    if (league.tier_snapshot && typeof league.tier_snapshot === 'object') {
      // @ts-ignore
      const snapshotMax = league.tier_snapshot.max_participants;
      if (snapshotMax) {
        maxCapacity = Number(snapshotMax);
      }
    }

    // Check league capacity
    const { count: memberCount } = await supabase
      .from('leaguemembers')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', league.league_id);

    if ((memberCount || 0) >= maxCapacity) {
      return NextResponse.json(
        { error: 'This league is full' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('league_id', league.league_id)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({
        success: true,
        alreadyMember: true,
        leagueId: league.league_id,
        leagueName: league.league_name,
        message: 'You are already a member of this league',
      });
    }

    // Lookup player role_id once
    const { data: roleRow, error: roleError } = await supabase
      .from('roles')
      .select('role_id')
      .eq('role_name', 'player')
      .maybeSingle();

    if (roleError || !roleRow?.role_id) {
      console.error('Failed to fetch player role', roleError);
      return NextResponse.json({ error: 'Configuration error: role missing' }, { status: 500 });
    }

    // Add user to league
    const { data: member, error: memberError } = await supabase
      .from('leaguemembers')
      .insert({
        user_id: session.user.id,
        league_id: league.league_id,
        team_id: null,
        created_by: session.user.id,
      })
      .select('league_member_id')
      .single();

    if (memberError || !member) {
      console.error('Failed to add league member', memberError);
      return NextResponse.json({ error: 'Failed to join league' }, { status: 500 });
    }

    // Assign player role
    const { error: assignError } = await supabase
      .from('assignedrolesforleague')
      .insert({
        user_id: session.user.id,
        league_id: league.league_id,
        role_id: roleRow.role_id,
        created_by: session.user.id,
      });

    if (assignError) {
      console.error('Failed to assign player role', assignError);
      return NextResponse.json({ error: 'Failed to join league (role)' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      leagueId: league.league_id,
      leagueName: league.league_name,
      message: 'Successfully joined league',
    });
  } catch (error) {
    console.error('Error joining league:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
