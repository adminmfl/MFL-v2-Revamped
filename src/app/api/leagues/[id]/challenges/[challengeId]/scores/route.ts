import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; challengeId: string }> }
) {
    try {
        const { id: leagueId, challengeId } = await params;
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

        if (!session?.user?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseServiceRole();

        // Get the league challenge to find the parent challenge_id
        const { data: challenge, error: challengeError } = await supabase
            .from('leagueschallenges')
            .select('challenge_id')
            .eq('id', challengeId)
            .eq('league_id', leagueId)
            .single();

        if (challengeError || !challenge?.challenge_id) {
            // No scores yet if no parent challenge
            return NextResponse.json({ scores: [] });
        }

        // Fetch existing scores
        const { data: scores, error: scoresError } = await supabase
            .from('specialchallengeteamscore')
            .select('team_id, score')
            .eq('challenge_id', challenge.challenge_id)
            .eq('league_id', leagueId);

        if (scoresError) {
            console.error('Failed to fetch scores:', scoresError);
            return NextResponse.json({ scores: [] });
        }

        return NextResponse.json({ scores: scores || [] });

    } catch (err) {
        console.error('Error in GET scores:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
