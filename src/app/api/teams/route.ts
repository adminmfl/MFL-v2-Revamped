/**
 * GET /api/teams - List teams for a league (with member counts)
 * POST /api/teams - Create a new team in a league (Governor/Host only)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const createTeamSchema = z.object({
  league_id: z.string().uuid('Invalid league ID'),
  team_name: z.string().min(1, 'Team name required'),
  avatar_url: z.string().url().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get league_id from query params
    const leagueId = req.nextUrl.searchParams.get('league_id');
    if (!leagueId) {
      return NextResponse.json(
        { error: 'league_id query parameter required' },
        { status: 400 }
      );
    }

    // TODO: Fetch teams for league with member counts
    // 1. Verify user is member of league
    // 2. Get all teams in league
    // 3. For each team, count members

    return NextResponse.json({ data: [], success: true });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createTeamSchema.parse(body);

    // TODO: Create team
    // 1. Check user is governor/host in league
    // 2. Check league is in draft status
    // 3. Create team
    // 4. Return created team

    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error creating team:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create team' },
      { status: 500 }
    );
  }
}
