/**
 * POST /api/leagues/[id]/join - Join a league (public leagues or with invite code)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getLeagueById } from '@/lib/services/leagues';
import { addLeagueMember } from '@/lib/services/memberships';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const league = await getLeagueById(id);
    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
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

    // Check if league is public or user has valid invite code (TODO: implement invite code logic)
    if (!league.is_public) {
      // For now, reject private leagues
      return NextResponse.json(
        { error: 'This league is private. You need an invite code.' },
        { status: 403 }
      );
    }

    // Check if league is open for joining (not completed)
    if (league.status === 'completed') {
      return NextResponse.json(
        { error: 'This league has ended' },
        { status: 400 }
      );
    }

    // Add user to league
    const member = await addLeagueMember(session.user.id, id, undefined, session.user.id);
    if (!member) {
      return NextResponse.json(
        { error: 'Failed to join league' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: member, success: true, message: 'Successfully joined league' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error joining league:', error);
    return NextResponse.json(
      { error: 'Failed to join league' },
      { status: 500 }
    );
  }
}

