import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

interface ActivityMinimumPayload {
  league_id: string;
  activity_id: string;
  symbol: string;
  min_value: number | null;
  age_group_overrides: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();
    const payload: ActivityMinimumPayload = await request.json();
    const { league_id, activity_id, symbol, min_value, age_group_overrides } = payload;

    // Validate input
    if (!symbol) {
      return NextResponse.json(
        { error: 'Invalid activity symbol' },
        { status: 400 }
      );
    }

    if (min_value !== null && min_value <= 0) {
      return NextResponse.json(
        { error: 'Minimum value must be greater than 0' },
        { status: 400 }
      );
    }

    // Get the leagueactivity record using activity_id
    const { data: leagueActivity, error: fetchError } = await supabase
      .from('leagueactivities')
      .select('id')
      .eq('league_id', league_id)
      .eq('league_id', league_id)
      .or(`activity_id.eq.${activity_id},custom_activity_id.eq.${activity_id}`)
      .single();

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Activity not found for this league' },
        { status: 404 }
      );
    }

    // Update the leagueactivity with minimums
    const { error: updateError } = await supabase
      .from('leagueactivities')
      .update({
        min_value,
        age_group_overrides,
        modified_by: session.user.id,
        modified_date: new Date().toISOString(),
      })
      .eq('id', leagueActivity.id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to save activity minimums' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `${symbol} minimums updated successfully`,
    });
  } catch (error) {
    console.error('Error in POST /api/leagues/activity-minimums:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
