/**
 * DELETE /api/leagues/[id]/roles/[userId] - Remove all roles from user (Host only)
 * GET /api/leagues/[id]/roles/[userId] - Get user's roles in league
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import {
  removeRoleFromUser,
  getUserRolesInLeague,
} from '@/lib/services/leagues';
import { userHasRole } from '@/lib/services/roles';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const roles = await getUserRolesInLeague(userId, id);
    return NextResponse.json({ data: roles, success: true });
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user roles' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id, userId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permission (must be host)
    const isHost = await userHasRole(session.user.id, id, 'host');
    if (!isHost) {
      return NextResponse.json(
        { error: 'Only host can remove roles' },
        { status: 403 }
      );
    }

    // Prevent removing self as host
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot remove yourself as host' },
        { status: 400 }
      );
    }

    const success = await removeRoleFromUser(userId, id, 'host');
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove role' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Role removed successfully' });
  } catch (error) {
    console.error('Error removing role:', error);
    return NextResponse.json(
      { error: 'Failed to remove role' },
      { status: 500 }
    );
  }
}
