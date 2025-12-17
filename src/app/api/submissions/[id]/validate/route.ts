/**
 * POST /api/submissions/[id]/validate - Approve or reject a workout submission
 *
 * Only governors, captains (for their team), and hosts can validate submissions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { z } from 'zod';

// ============================================================================
// Validation Schema
// ============================================================================

const validateSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().optional(),
});

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: submissionId } = await params;
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status, rejection_reason } = validateSchema.parse(body);

    const supabase = getSupabaseServiceRole();
    const userId = session.user.id;

    // Get the submission with league info
    const { data: submission, error: submissionError } = await supabase
      .from('effortentry')
      .select(`
        id,
        league_member_id,
        status,
        leaguemembers!inner(
          league_id,
          team_id,
          user_id
        )
      `)
      .eq('id', submissionId)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json(
        { error: 'Submission not found' },
        { status: 404 }
      );
    }

    const leagueMember = submission.leaguemembers as any;
    const leagueId = leagueMember.league_id;
    const submissionTeamId = leagueMember.team_id;

    // Check user's permissions to validate this submission
    // 1. Check if user is host
    const { data: league } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', leagueId)
      .single();

    const isHost = league?.created_by === userId;

    // 2. Check if user is governor
    const { data: governorRole } = await supabase
      .from('assignedrolesforleague')
      .select('role_id, roles!inner(role_name)')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle();

    const isGovernor = (governorRole?.roles as any)?.role_name === 'governor';

    // 3. Check if user is captain of the submission's team (via assignedrolesforleague)
    let isCaptainOfTeam = false;
    if (submissionTeamId) {
      // First check if user is on this team
      const { data: memberCheck } = await supabase
        .from('leaguemembers')
        .select('league_member_id')
        .eq('user_id', userId)
        .eq('team_id', submissionTeamId)
        .eq('league_id', leagueId)
        .maybeSingle();

      if (memberCheck) {
        // Check if user has captain role
        const { data: captainRole } = await supabase
          .from('roles')
          .select('role_id')
          .eq('role_name', 'captain')
          .single();

        if (captainRole) {
          const { data: captainCheck } = await supabase
            .from('assignedrolesforleague')
            .select('id')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .eq('role_id', captainRole.role_id)
            .maybeSingle();

          isCaptainOfTeam = !!captainCheck;
        }
      }
    }

    // Permission check
    if (!isHost && !isGovernor && !isCaptainOfTeam) {
      return NextResponse.json(
        { error: 'You do not have permission to validate this submission' },
        { status: 403 }
      );
    }

    // Prevent validating own submission (unless host)
    if (!isHost && leagueMember.user_id === userId) {
      return NextResponse.json(
        { error: 'You cannot validate your own submission' },
        { status: 403 }
      );
    }

    // Update the submission status
    const updateData: Record<string, any> = {
      status,
      modified_by: userId,
      modified_date: new Date().toISOString(),
    };

    // Store rejection reason if provided (you may need to add this column)
    // if (rejection_reason) {
    //   updateData.rejection_reason = rejection_reason;
    // }

    const { data: updatedSubmission, error: updateError } = await supabase
      .from('effortentry')
      .update(updateData)
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating submission:', updateError);
      return NextResponse.json(
        { error: 'Failed to update submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedSubmission,
    });
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
