/**
 * GET /api/invite/team/[code] - Validate team invite code (PUBLIC - no auth required)
 * POST /api/invite/team/[code] - Join team using invite code (AUTH required)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { validateTeamInviteCode, joinTeamByCode } from '@/lib/services/invites';

/**
 * GET - Public endpoint to validate team invite code
 * Returns team and league info without requiring authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code || code.length < 4) {
      return NextResponse.json(
        { error: 'Invalid team invite code format' },
        { status: 400 }
      );
    }

    const teamInfo = await validateTeamInviteCode(code);

    if (!teamInfo) {
      return NextResponse.json(
        { error: 'Invalid team invite code', valid: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      team: {
        team_id: teamInfo.team_id,
        name: teamInfo.team_name,
        member_count: teamInfo.team_member_count,
        max_capacity: teamInfo.team_max_capacity,
        is_full: teamInfo.is_team_full,
      },
      league: {
        league_id: teamInfo.league_id,
        name: teamInfo.league_name,
        description: teamInfo.league_description,
        status: teamInfo.league_status,
        start_date: teamInfo.start_date,
        end_date: teamInfo.end_date,
      },
      can_join: teamInfo.can_join,
    });
  } catch (error) {
    console.error('Error validating team invite code:', error);
    return NextResponse.json(
      { error: 'Failed to validate team invite code' },
      { status: 500 }
    );
  }
}

/**
 * POST - Join team using invite code (requires authentication)
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
        { error: 'Invalid team invite code format' },
        { status: 400 }
      );
    }

    const result = await joinTeamByCode(session.user.id, code);

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
      teamId: result.teamId,
      teamName: result.teamName,
      message: result.alreadyMember
        ? 'You are already a member of this team'
        : 'Successfully joined team',
    });
  } catch (error) {
    console.error('Error joining team:', error);
    return NextResponse.json(
      { error: 'Failed to join team' },
      { status: 500 }
    );
  }
}
