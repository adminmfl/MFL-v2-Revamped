/**
 * GET /api/submissions/[id] - Get submission details
 * PATCH /api/submissions/[id] - Update submission (owner only, if pending)
 * DELETE /api/submissions/[id] - Delete submission (owner only, if pending)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const updateEntrySchema = z.object({
  activity_name: z.string().optional(),
  distance: z.number().positive().optional(),
  duration_minutes: z.number().positive().optional(),
  intensity_level: z.enum(['low', 'medium', 'high']).optional(),
  notes: z.string().optional(),
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

    // TODO: Fetch submission from DB with proper permissions check
    // For now, return placeholder
    return NextResponse.json(
      { error: 'Submission not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch submission' },
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
    const validated = updateEntrySchema.parse(body);

    // TODO: Update submission in DB with owner/pending status check
    return NextResponse.json(
      { error: 'Submission not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error updating submission:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update submission' },
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

    // TODO: Delete submission with owner/pending status check
    return NextResponse.json(
      { error: 'Submission not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json(
      { error: 'Failed to delete submission' },
      { status: 500 }
    );
  }
}

