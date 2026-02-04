import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { z } from 'zod';

const CheckNameSchema = z.object({
  league_name: z.string().min(1, 'League name is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    const { league_name } = CheckNameSchema.parse(body);

    // Get Supabase client
    const supabase = getSupabaseServiceRole();

    // Check if league with this name already exists
    const { count, error } = await supabase
      .from('leagues')
      .select('*', { count: 'exact', head: true })
      .eq('league_name', league_name);

    if (error) {
      console.error('Error checking league name:', error);
      return NextResponse.json(
        { error: 'Failed to check league name' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exists: (count ?? 0) > 0,
      success: true,
    });
  } catch (error) {
    console.error('Error in check-name route:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred while checking the league name' },
      { status: 500 }
    );
  }
}
