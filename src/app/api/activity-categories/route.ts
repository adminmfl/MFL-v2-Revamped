/**
 * Activity Categories API
 * 
 * Returns all activity categories for dropdown population.
 * 
 * GET /api/activity-categories - List all activity categories
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
    try {
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseServiceRole();

        const { data: categories, error } = await supabase
            .from('activity_categories')
            .select('category_id, category_name, display_name, description, display_order')
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching activity categories:', error);
            return NextResponse.json(
                { error: 'Failed to fetch activity categories' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: categories || [],
        });
    } catch (error) {
        console.error('Error in activity categories GET:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
