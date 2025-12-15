/**
 * GET /api/teams/[id] - Get team details with members
 * PATCH /api/teams/[id] - Update team (Captain/Governor/Host only)
 * DELETE /api/teams/[id] - Delete team (Governor/Host only, draft league only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const updateTeamSchema = z.object({
  team_name: z.string().min(1, 'Team name required').optional(),
  avatar_url: z.string().url().optional(),
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

    // TODO: Fetch team with members from DB
    // 1. Get team by id
    // 2. Verify user is in league (can view team)
    // 3. Get team members with entries count

    return NextResponse.json(
      { error: 'Team not found' },
      { status: 404 }
    );
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = updateTeamSchema.parse(body);

    // TODO: Update team
    // 1. Fetch team by id
    // 2. Check user is captain/governor/host in league
    // 3. Update team fields
    // 4. Return updated team

    return NextResponse.json(
      { error: 'Team not found' },
      { status: 404 }
    );
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Delete team
    // 1. Fetch team by id
    // 2. Check user is governor/host in league
    // 3. Check league is in draft status
    // 4. Delete team

    return NextResponse.json(
      { error: 'Team not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error deleting team:', error);
    return NextResponse.json(
      { error: 'Failed to delete team' },
      { status: 500 }
    );
  }
}

