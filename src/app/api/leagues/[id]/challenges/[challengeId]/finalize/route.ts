
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function POST(
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
        const userId = session.user.id;

        // 1. Verify access (Host/Governor only)
        const { data: memberRole, error: roleError } = await supabase
            .from('assignedrolesforleague')
            .select('roles(role_name)')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .maybeSingle();

        const userRole = memberRole?.roles?.role_name;
        if (roleError || (userRole !== 'host' && userRole !== 'governor')) {
            return NextResponse.json({ success: false, error: 'Forbidden: Admins only' }, { status: 403 });
        }

        const body = await req.json();
        const { scores } = body; // Array of { teamId: string, points: number }

        if (!Array.isArray(scores)) {
            return NextResponse.json({ success: false, error: 'Invalid scores format' }, { status: 400 });
        }

        // 2. Get the league challenge details
        const { data: challenge, error: challengeError } = await supabase
            .from('leagueschallenges')
            .select('*')
            .eq('id', challengeId)
            .eq('league_id', leagueId)
            .single();

        if (challengeError || !challenge) {
            return NextResponse.json({ success: false, error: 'Challenge not found' }, { status: 404 });
        }

        let parentChallengeId = challenge.challenge_id;

        // 3. Handle Custom Challenges (Missing parent ID)
        // If this is a custom tournament, it might not have a link to `specialchallenges`.
        // We MUST create/link one because `specialchallengeteamscore` requires `challenge_id` FK.
        if (!parentChallengeId) {
            // Create a hidden placeholder special challenge
            const { data: newParent, error: createError } = await supabase
                .from('specialchallenges')
                .insert({
                    name: challenge.name || 'Custom Tournament Placeholder',
                    description: 'Auto-generated parent for custom tournament scores',
                    challenge_type: 'individual', // Default, doesn't matter much for this shim
                    is_custom: true,
                    created_by: userId
                })
                .select('challenge_id')
                .single();

            if (createError || !newParent) {
                console.error('Failed to create placeholder parent challenge:', createError);
                return NextResponse.json({ success: false, error: 'Failed to initialize scoring system' }, { status: 500 });
            }

            parentChallengeId = newParent.challenge_id;

            // Link it back to the league challenge
            const { error: linkError } = await supabase
                .from('leagueschallenges')
                .update({ challenge_id: parentChallengeId })
                .eq('id', challengeId);

            if (linkError) {
                console.error('Failed to link placeholder parent:', linkError);
                return NextResponse.json({ success: false, error: 'Failed to link scoring system' }, { status: 500 });
            }
        }

        // 4. Upsert Scores
        // We use a loop for now (or bulk upsert if supported/cleaner)
        const upsertPromises = scores.map(async (scoreItem: { teamId: string; points: number }) => {
            // Check if a score record exists
            const { data: existing } = await supabase
                .from('specialchallengeteamscore')
                .select('id')
                .eq('challenge_id', parentChallengeId)
                .eq('team_id', scoreItem.teamId)
                .eq('league_id', leagueId)
                .maybeSingle();

            if (existing) {
                return supabase
                    .from('specialchallengeteamscore')
                    .update({
                        score: scoreItem.points,
                        modified_by: userId,
                        modified_date: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                return supabase
                    .from('specialchallengeteamscore')
                    .insert({
                        challenge_id: parentChallengeId,
                        team_id: scoreItem.teamId,
                        league_id: leagueId,
                        score: scoreItem.points,
                        created_by: userId
                    });
            }
        });

        await Promise.all(upsertPromises);

        // Optionally close the tournament? 
        // For now we just update scores. The user can manually close via status update if they want.
        // Or we could set status = 'completed' here. Let's keep it purely scoring for now.

        return NextResponse.json({ success: true, message: 'Points updated successfully' });

    } catch (err) {
        console.error('Error in finalize tournament:', err);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
