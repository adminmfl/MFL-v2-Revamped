/**
 * GET /api/submissions - List submissions for user (optionally filtered by league)
 * POST /api/submissions - Submit a workout entry
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import {
  getEntriesForMember,
  submitWorkout,
} from '@/lib/services/entries';
import { z } from 'zod';

const submitEntrySchema = z.object({
  league_id: z.string().uuid('Invalid league ID'),
  activity_name: z.string().min(1, 'Activity name required'),
  distance: z.number().positive().optional(),
  duration_minutes: z.number().positive().optional(),
  intensity_level: z.enum(['low', 'medium', 'high']).optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional league_id filter
    const leagueId = req.nextUrl.searchParams.get('league_id');

    const entries = leagueId
      ? await getEntriesForMember(session.user.id, leagueId)
      : await getEntriesForMember(session.user.id);

    return NextResponse.json({ data: entries, success: true });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
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
    const validated = submitEntrySchema.parse(body);

    const entry = await submitWorkout(session.user.id, validated);
    if (!entry) {
      return NextResponse.json(
        { error: 'Failed to submit workout entry' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: entry, success: true, message: 'Workout submitted successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting entry:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to submit entry' },
      { status: 500 }
    );
  }
}

