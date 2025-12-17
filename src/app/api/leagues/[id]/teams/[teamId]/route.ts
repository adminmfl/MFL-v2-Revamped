/**
 * GET /api/leagues/[id]/teams/[teamId] - Get team details with members
 * PATCH /api/leagues/[id]/teams/[teamId] - Update team name
 * DELETE /api/leagues/[id]/teams/[teamId] - Delete team (Host/Governor only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';
import {
  getTeamById,
  getTeamMembers,
  updateTeam,
  deleteTeamFromLeague,
} from '@/lib/services/teams';
import { userHasAnyRole } from '@/lib/services/roles';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// Helper to check if user is league member
async function isLeagueMember(userId: string, leagueId: string): Promise<boolean> {
  const supabase = getSupabaseServiceRole();
  const { data } = await supabase
    .from('leaguemembers')
    .select('league_member_id')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .maybeSingle();
  return !!data;
}

const updateTeamSchema = z.object({
  team_name: z.string().min(1, 'Team name is required').max(100, 'Team name too long'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: leagueId, teamId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a member of this league (via leaguemembers or roles)
    const isMember = await isLeagueMember(session.user.id, leagueId);
    const hasRole = await userHasAnyRole(session.user.id, leagueId, [
      'host',
      'governor',
      'captain',
      'player',
    ]);

    if (!isMember && !hasRole) {
      return NextResponse.json(
        { error: 'You are not a member of this league' },
        { status: 403 }
      );
    }

    // Get team
    const team = await getTeamById(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team members with roles
    const members = await getTeamMembers(teamId, leagueId);

    return NextResponse.json({
      success: true,
      data: {
        ...team,
        members,
        member_count: members.length,
        captain: members.find((m) => m.is_captain) || null,
      },
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: leagueId, teamId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (must be host or governor)
    const canUpdate = await userHasAnyRole(session.user.id, leagueId, [
      'host',
      'governor',
    ]);

    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Only host or governor can update teams' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateTeamSchema.parse(body);

    const updated = await updateTeam(teamId, validated.team_name, session.user.id);

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update team' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating team:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update team' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> }
) {
  try {
    const { id: leagueId, teamId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions (must be host or governor)
    const canDelete = await userHasAnyRole(session.user.id, leagueId, [
      'host',
      'governor',
    ]);

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Only host or governor can delete teams' },
        { status: 403 }
      );
    }

    const success = await deleteTeamFromLeague(teamId, leagueId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete team' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}
