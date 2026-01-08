import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

type LeagueRole = 'host' | 'governor' | 'captain' | 'player' | null;

type ChallengeStatus =
    | 'draft'
    | 'scheduled'
    | 'active'
    | 'submission_closed'
    | 'published'
    | 'closed';

type Membership = { leagueMemberId: string; role: LeagueRole };

function buildError(message: string, status = 400) {
    return NextResponse.json({ success: false, error: message }, { status });
}

function isHostOrGovernor(role: LeagueRole): boolean {
    return role === 'host' || role === 'governor';
}

async function getMembership(userId: string, leagueId: string): Promise<Membership | null> {
    const supabase = getSupabaseServiceRole();

    const { data: memberData, error: memberError } = await supabase
        .from('leaguemembers')
        .select('league_member_id')
        .eq('user_id', userId)
        .eq('league_id', leagueId)
        .maybeSingle();

    if (memberError || !memberData) return null;

    const { data: roleData, error: roleError } = await supabase
        .from('assignedrolesforleague')
        .select('roles(role_name)')
        .eq('user_id', userId)
        .eq('league_id', leagueId);

    if (roleError) return null;

    const roleNames = (roleData || []).map((r: any) => r.roles?.role_name).filter(Boolean);
    const primaryRole = (roleNames[0] as LeagueRole) ?? null;

    return {
        leagueMemberId: String(memberData.league_member_id),
        role: primaryRole,
    };
}

// POST - Close a challenge (published -> closed)
export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
    try {
        const { id: leagueId, challengeId } = await params;
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

        if (!session?.user?.id) {
            return buildError('Unauthorized', 401);
        }

        const supabase = getSupabaseServiceRole();
        const membership = await getMembership(session.user.id, leagueId);

        if (!membership || !isHostOrGovernor(membership.role)) {
            return buildError('Only hosts or governors can close challenges', 403);
        }

        const { data: challenge, error: challengeError } = await supabase
            .from('leagueschallenges')
            .select('id, league_id, status')
            .eq('id', challengeId)
            .maybeSingle();

        if (challengeError || !challenge) {
            return buildError('Challenge not found', 404);
        }

        if (String(challenge.league_id) !== String(leagueId)) {
            return buildError('Challenge does not belong to this league', 403);
        }

        if (challenge.status !== 'published') {
            return buildError('Challenge must be published before it can be closed', 400);
        }

        const { data: updated, error: updateError } = await supabase
            .from('leagueschallenges')
            .update({ status: 'closed' })
            .eq('id', challengeId)
            .eq('league_id', leagueId)
            .select()
            .single();

        if (updateError || !updated) {
            console.error('Error closing challenge:', updateError);
            return buildError('Failed to close challenge', 500);
        }

        return NextResponse.json({ success: true, status: 'closed' });
    } catch (err: any) {
        console.error('Unexpected error closing challenge:', err);
        return buildError(err?.message || 'Internal server error', 500);
    }
}
