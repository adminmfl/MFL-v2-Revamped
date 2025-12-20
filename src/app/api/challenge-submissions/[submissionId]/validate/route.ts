import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

type LeagueRole = 'host' | 'governor' | 'captain' | 'player' | null;

function buildError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

async function getMembership(userId: string, leagueId: string) {
  const supabase = getSupabaseServiceRole();
  
  // First check if user is a league member
  const { data: memberData, error: memberError } = await supabase
    .from('leaguemembers')
    .select('league_member_id')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .maybeSingle();

  if (memberError || !memberData) {
    return null;
  }

  // Then fetch the user's roles in this league
  const { data: roleData, error: roleError } = await supabase
    .from('assignedrolesforleague')
    .select('roles(role_name)')
    .eq('user_id', userId)
    .eq('league_id', leagueId);

  if (roleError) {
    return null;
  }

  // Get the first role (or highest priority role if multiple)
  const roleNames = (roleData || []).map((r: any) => r.roles?.role_name).filter(Boolean);
  return (roleNames[0] as LeagueRole) ?? null;
}

function isHostOrGovernor(role: LeagueRole) {
  return role === 'host' || role === 'governor';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return buildError('Unauthorized', 401);
    }

    const { submissionId } = await params;
    const supabase = getSupabaseServiceRole();

    // Fetch submission with league context
    const { data: submission, error: fetchError } = await supabase
      .from('challenge_submissions')
      .select(
        `
        id,
        league_challenge_id,
        status,
        leagueschallenges(league_id)
      `
      )
      .eq('id', submissionId)
      .maybeSingle();

    if (fetchError || !submission) {
      return buildError('Submission not found', 404);
    }

    const leagueId = (submission as any).leagueschallenges?.league_id;
    if (!leagueId) {
      return buildError('Submission missing league context', 400);
    }

    const role = await getMembership(session.user.id, String(leagueId));
    if (!role || !isHostOrGovernor(role)) {
      return buildError('Forbidden', 403);
    }

    const body = await req.json();
    const { status, awardedPoints } = body as { status: 'approved' | 'rejected'; awardedPoints?: number };

    if (!status || (status !== 'approved' && status !== 'rejected')) {
      return buildError('status must be approved or rejected', 400);
    }

    const { data, error: updateError } = await supabase
      .from('challenge_submissions')
      .update({
        status,
        awarded_points: awardedPoints ?? null,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating challenge submission', updateError);
      return buildError('Failed to update submission', 500);
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Unexpected error validating challenge submission', err);
    return buildError('Internal server error', 500);
  }
}
