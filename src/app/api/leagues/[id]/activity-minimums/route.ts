// =====================================================================================
// API Route: GET /api/leagues/[id]/activity-minimums
// Description: Fetch all activity minimums for a league
// =====================================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getLeagueActivityMinimums } from '@/lib/services/league-minimums';
import type { ActivityMinimumsListResponse } from '@/types/league-minimums';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<ActivityMinimumsListResponse>> {
  try {
    const leagueId = params.id;
    
    if (!leagueId) {
      return NextResponse.json(
        { success: false, data: [], error: 'League ID is required' } as any,
        { status: 400 }
      );
    }
    
    // Fetch minimums (uses cache if available)
    const minimums = await getLeagueActivityMinimums(leagueId);
    
    // Transform to API response format
    const response = minimums.map(m => ({
      id: m.id,
      activityId: m.activity_id,
      measurementType: m.measurement_type,
      baseMinimum: {
        min: m.min_value,
        max: m.max_value,
        minRR: m.min_rr,
        maxRR: m.max_rr
      },
      ageGroupOverrides: m.age_group_overrides
    }));
    
    return NextResponse.json({
      success: true,
      data: response
    });
    
  } catch (error) {
    console.error('Error fetching activity minimums:', error);
    return NextResponse.json(
      { 
        success: false, 
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error' 
      } as any,
      { status: 500 }
    );
  }
}
