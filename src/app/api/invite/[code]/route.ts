/**
 * GET /api/invite/[code] - Validate invite code (PUBLIC - no auth required)
 * POST /api/invite/[code] - Join league using invite code (AUTH required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { validateInviteCode, joinLeagueByCode } from '@/lib/services/invites';

/**
 * GET - Public endpoint to validate invite code
 * Returns league info without requiring authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length < 4) {
      return NextResponse.json(
        { error: 'Invalid invite code format' },
        { status: 400 }
      );
    }

    const leagueInfo = await validateInviteCode(code);

    if (!leagueInfo) {
      return NextResponse.json(
        { error: 'Invalid invite code', valid: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      league: {
        league_id: leagueInfo.league_id,
        name: leagueInfo.league_name,
        description: leagueInfo.description,
        status: leagueInfo.status,
        start_date: leagueInfo.start_date,
        end_date: leagueInfo.end_date,
        member_count: leagueInfo.member_count,
        max_capacity: leagueInfo.max_capacity,
        is_full: leagueInfo.is_full,
        can_join: leagueInfo.can_join,
      },
    });
  } catch (error) {
    console.error('Error validating invite code:', error);
    return NextResponse.json(
      { error: 'Failed to validate invite code' },
      { status: 500 }
    );
  }
}

/**
 * POST - Join league using invite code (requires authentication)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required', requiresAuth: true },
        { status: 401 }
      );
    }

    if (!code || code.length < 4) {
      return NextResponse.json(
        { error: 'Invalid invite code format' },
        { status: 400 }
      );
    }

    const result = await joinLeagueByCode(session.user.id, code);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, success: false },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      alreadyMember: result.alreadyMember || false,
      leagueId: result.leagueId,
      leagueName: result.leagueName,
      message: result.alreadyMember
        ? 'You are already a member of this league'
        : 'Successfully joined league',
    });
  } catch (error) {
    console.error('Error joining league:', error);
    return NextResponse.json(
      { error: 'Failed to join league' },
      { status: 500 }
    );
  }
}
