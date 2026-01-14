/**
 * REST API for Individual Rest Day Donation
 * PATCH: Approve or reject a donation (Governor/Host only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { z } from 'zod';

const updateDonationSchema = z.object({
    status: z.enum(['approved', 'rejected']),
});

/**
 * Helper to calculate final rest days for a member (including donations)
 */
async function getMemberFinalRestDays(
    supabase: ReturnType<typeof getSupabaseServiceRole>,
    leagueMemberId: string,
    leagueId: string
): Promise<{ autoRestDays: number; received: number; donated: number; totalAllowed: number; finalRemaining: number }> {
    // Get league config
    const { data: league } = await supabase
        .from('leagues')
        .select('rest_days')
        .eq('league_id', leagueId)
        .single();

    const totalAllowed = league?.rest_days ?? 1;

    // Count auto rest days (from effortentry)
    const { count: autoRestDays } = await supabase
        .from('effortentry')
        .select('*', { count: 'exact', head: true })
        .eq('league_member_id', leagueMemberId)
        .eq('type', 'rest')
        .eq('status', 'approved');

    // Get approved donations received
    const { data: receivedDonations } = await supabase
        .from('rest_day_donations')
        .select('days_transferred')
        .eq('receiver_member_id', leagueMemberId)
        .eq('status', 'approved');

    const received = (receivedDonations || []).reduce((sum, d) => sum + d.days_transferred, 0);

    // Get approved donations given
    const { data: donatedDonations } = await supabase
        .from('rest_day_donations')
        .select('days_transferred')
        .eq('donor_member_id', leagueMemberId)
        .eq('status', 'approved');

    const donated = (donatedDonations || []).reduce((sum, d) => sum + d.days_transferred, 0);

    // Formula: final_used = auto + donated - received
    // (donated increases usage, received decreases usage)
    const finalUsed = (autoRestDays || 0) + donated - received;
    const finalRemaining = Math.max(0, totalAllowed - finalUsed);

    return {
        autoRestDays: autoRestDays || 0,
        received,
        donated,
        totalAllowed,
        finalRemaining,
    };
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; donationId: string }> }
) {
    try {
        const { id: leagueId, donationId } = await params;
        const session = await getServerSession(authOptions as any);

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const supabase = getSupabaseServiceRole();

        // Verify user is a member of this league
        const { data: membership, error: memberError } = await supabase
            .from('leaguemembers')
            .select('league_member_id')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .single();

        if (memberError || !membership) {
            return NextResponse.json({ error: 'Not a member of this league' }, { status: 403 });
        }

        // Get user's role in league
        const { data: roleData } = await supabase
            .from('assignedrolesforleague')
            .select('role_id, roles(role_name)')
            .eq('user_id', userId)
            .eq('league_id', leagueId);

        // Determine highest role
        const roleNames = (roleData || []).map((r: any) => r.roles?.role_name?.toLowerCase()).filter(Boolean);
        const isGovernorOrHost = roleNames.includes('host') || roleNames.includes('governor');

        if (!isGovernorOrHost) {
            return NextResponse.json({ error: 'Only Governor or Host can approve/reject donations' }, { status: 403 });
        }

        // Parse and validate body
        const body = await req.json();
        const parsed = updateDonationSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
        }

        const { status } = parsed.data;

        // Get the donation
        const { data: donation, error: donationError } = await supabase
            .from('rest_day_donations')
            .select('*')
            .eq('id', donationId)
            .eq('league_id', leagueId)
            .single();

        if (donationError || !donation) {
            return NextResponse.json({ error: 'Donation not found' }, { status: 404 });
        }

        if (donation.status !== 'pending') {
            return NextResponse.json({ error: 'Donation has already been processed' }, { status: 400 });
        }

        // If approving, validate donor has enough rest days
        if (status === 'approved') {
            const donorStats = await getMemberFinalRestDays(supabase, donation.donor_member_id, leagueId);

            if (donorStats.finalRemaining < donation.days_transferred) {
                return NextResponse.json({
                    error: `Donor only has ${donorStats.finalRemaining} rest days remaining, cannot donate ${donation.days_transferred}`,
                }, { status: 400 });
            }
        }

        // Update donation status
        const { data: updatedDonation, error: updateError } = await supabase
            .from('rest_day_donations')
            .update({
                status,
                approved_by: userId,
            })
            .eq('id', donationId)
            .select()
            .single();

        if (updateError) {
            console.error('Error updating donation:', updateError);
            return NextResponse.json({ error: 'Failed to update donation' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: updatedDonation,
        });
    } catch (error) {
        console.error('Error in rest-day-donations PATCH:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
