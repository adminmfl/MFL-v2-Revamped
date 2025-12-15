/**
 * GET /api/leagues/[id]/members - List league members (with roles)
 * POST /api/leagues/[id]/members - Add member (Host/Governor only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import {
  getLeagueMembersForLeague,
  addLeagueMember,
} from '@/lib/services/memberships';
import { getUserRolesInLeague } from '@/lib/services/leagues';
import { userHasAnyRole } from '@/lib/services/roles';
import { z } from 'zod';

const addMemberSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  team_id: z.string().uuid('Invalid team ID').optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is member of league
    const members = await getLeagueMembersForLeague(id);
    const isUserMember = members.some((m) => m.user_id === session.user.id);
    if (!isUserMember) {
      return NextResponse.json(
        { error: 'You are not a member of this league' },
        { status: 403 }
      );
    }

    // Fetch members with their roles
    const membersWithRoles = await Promise.all(
      members.map(async (member) => ({
        ...member,
        roles: await getUserRolesInLeague(member.user_id, id),
      }))
    );

    return NextResponse.json({ data: membersWithRoles, success: true });
  } catch (error) {
    console.error('Error fetching league members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

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

    // Check permissions (must be host or governor)
    const canAdd = await userHasAnyRole(session.user.id, id, [
      'host',
      'governor',
    ]);
    if (!canAdd) {
      return NextResponse.json(
        { error: 'Only host or governor can add members' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = addMemberSchema.parse(body);

    const member = await addLeagueMember(
      validated.user_id,
      id,
      validated.team_id,
      session.user.id
    );

    if (!member) {
      return NextResponse.json(
        { error: 'Failed to add member' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: member, success: true },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding member:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to add member' },
      { status: 500 }
    );
  }
}

