/**
 * POST /api/submissions/[id]/validate - Approve or reject a workout submission
 * Only governors/captains/hosts can approve/reject submissions
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { z } from 'zod';

const validateEntrySchema = z.object({
  approved: z.boolean(),
  rejection_reason: z.string().optional(),
});

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

    const body = await request.json();
    const validated = validateEntrySchema.parse(body);

    // TODO: Validate submission
    // 1. Fetch submission by id
    // 2. Check user is governor/captain/host in that league
    // 3. Update submission status (approved/rejected)
    // 4. If rejected, store rejection reason
    // 5. Return updated submission

    return NextResponse.json(
      { error: 'Submission not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error validating submission:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to validate submission' },
      { status: 500 }
    );
  }
}

