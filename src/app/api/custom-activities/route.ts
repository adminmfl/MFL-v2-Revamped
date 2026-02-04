/**
 * Custom Activities API
 * 
 * Manages host-created custom activities that can be reused across leagues.
 * 
 * GET /api/custom-activities - List all custom activities created by the current user
 * POST /api/custom-activities - Create a new custom activity
 * PATCH /api/custom-activities - Update an existing custom activity
 * DELETE /api/custom-activities - Delete a custom activity
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface CustomActivity {
    custom_activity_id: string;
    activity_name: string;
    description: string | null;
    category_id: string | null;
    category?: {
        category_id: string;
        category_name: string;
        display_name: string;
    } | null;
    measurement_type: 'duration' | 'distance' | 'hole' | 'steps' | 'none';
    requires_proof: boolean;
    requires_notes: boolean;
    is_active: boolean;
    created_by: string;
    created_date: string;
    usage_count?: number; // Number of leagues using this activity
}

// ============================================================================
// GET Handler - List user's custom activities
// ============================================================================

export async function GET(request: NextRequest) {
    try {
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const supabase = getSupabaseServiceRole();

        // Get all custom activities created by this user with category join
        const { data: activities, error } = await supabase
            .from('custom_activities')
            .select(`
                *,
                category:activity_categories(category_id, category_name, display_name)
            `)
            .eq('created_by', userId)
            .eq('is_active', true)
            .order('activity_name');

        if (error) {
            console.error('Error fetching custom activities:', error);
            return NextResponse.json(
                { error: 'Failed to fetch custom activities' },
                { status: 500 }
            );
        }

        // Get usage count for each activity (how many leagues use it)
        const activityIds = (activities || []).map((a) => a.custom_activity_id);

        let usageCounts: Record<string, number> = {};
        if (activityIds.length > 0) {
            const { data: usageData } = await supabase
                .from('leagueactivities')
                .select('custom_activity_id, league_id')
                .in('custom_activity_id', activityIds);

            if (usageData) {
                usageData.forEach((row) => {
                    if (row.custom_activity_id) {
                        usageCounts[row.custom_activity_id] = (usageCounts[row.custom_activity_id] || 0) + 1;
                    }
                });
            }
        }

        const activitiesWithUsage: CustomActivity[] = (activities || []).map((a) => ({
            ...a,
            usage_count: usageCounts[a.custom_activity_id] || 0,
        }));

        return NextResponse.json({
            success: true,
            data: activitiesWithUsage,
        });
    } catch (error) {
        console.error('Error in custom activities GET:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// POST Handler - Create a new custom activity
// ============================================================================

export async function POST(request: NextRequest) {
    try {
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const supabase = getSupabaseServiceRole();
        const body = await request.json();

        const {
            activity_name,
            description,
            category_id,
            measurement_type = 'none',
            requires_proof = true,
            requires_notes = false,
        } = body;

        // Validation
        if (!activity_name || typeof activity_name !== 'string' || activity_name.trim().length < 2) {
            return NextResponse.json(
                { error: 'Activity name is required (min 2 characters)' },
                { status: 400 }
            );
        }

        const validMeasurementTypes = ['duration', 'distance', 'hole', 'steps', 'none'];
        if (!validMeasurementTypes.includes(measurement_type)) {
            return NextResponse.json(
                { error: `Invalid measurement type. Must be one of: ${validMeasurementTypes.join(', ')}` },
                { status: 400 }
            );
        }

        // Check for duplicate name for this user
        const { data: existing } = await supabase
            .from('custom_activities')
            .select('custom_activity_id')
            .eq('created_by', userId)
            .ilike('activity_name', activity_name.trim())
            .maybeSingle();

        if (existing) {
            return NextResponse.json(
                { error: 'You already have a custom activity with this name' },
                { status: 409 }
            );
        }

        // Create the custom activity
        const { data: created, error: createError } = await supabase
            .from('custom_activities')
            .insert({
                activity_name: activity_name.trim(),
                description: description?.trim() || null,
                category_id: category_id || null,
                measurement_type,
                requires_proof: Boolean(requires_proof),
                requires_notes: Boolean(requires_notes),
                created_by: userId,
            })
            .select(`
                *,
                category:activity_categories(category_id, category_name, display_name)
            `)
            .single();

        if (createError) {
            console.error('Error creating custom activity:', createError);
            return NextResponse.json(
                { error: 'Failed to create custom activity' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: created,
            message: 'Custom activity created successfully',
        });
    } catch (error) {
        console.error('Error in custom activities POST:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// PATCH Handler - Update an existing custom activity
// ============================================================================

export async function PATCH(request: NextRequest) {
    try {
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const supabase = getSupabaseServiceRole();
        const body = await request.json();

        const { custom_activity_id, activity_name, description, category_id, measurement_type, requires_proof, requires_notes } = body;

        if (!custom_activity_id) {
            return NextResponse.json(
                { error: 'custom_activity_id is required' },
                { status: 400 }
            );
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('custom_activities')
            .select('created_by')
            .eq('custom_activity_id', custom_activity_id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { error: 'Custom activity not found' },
                { status: 404 }
            );
        }

        if (existing.created_by !== userId) {
            return NextResponse.json(
                { error: 'You can only edit your own custom activities' },
                { status: 403 }
            );
        }

        // Build update object
        const updates: any = { modified_by: userId, modified_date: new Date().toISOString() };

        if (activity_name !== undefined) {
            if (typeof activity_name !== 'string' || activity_name.trim().length < 2) {
                return NextResponse.json(
                    { error: 'Activity name must be at least 2 characters' },
                    { status: 400 }
                );
            }
            updates.activity_name = activity_name.trim();
        }

        if (description !== undefined) {
            updates.description = description?.trim() || null;
        }

        if (measurement_type !== undefined) {
            const validMeasurementTypes = ['duration', 'distance', 'hole', 'steps', 'none'];
            if (!validMeasurementTypes.includes(measurement_type)) {
                return NextResponse.json(
                    { error: `Invalid measurement type. Must be one of: ${validMeasurementTypes.join(', ')}` },
                    { status: 400 }
                );
            }
            updates.measurement_type = measurement_type;
        }

        if (requires_proof !== undefined) {
            updates.requires_proof = Boolean(requires_proof);
        }

        if (requires_notes !== undefined) {
            updates.requires_notes = Boolean(requires_notes);
        }

        if (category_id !== undefined) {
            updates.category_id = category_id || null;
        }

        const { data: updated, error: updateError } = await supabase
            .from('custom_activities')
            .update(updates)
            .eq('custom_activity_id', custom_activity_id)
            .select(`
                *,
                category:activity_categories(category_id, category_name, display_name)
            `)
            .single();

        if (updateError) {
            console.error('Error updating custom activity:', updateError);
            return NextResponse.json(
                { error: 'Failed to update custom activity' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: updated,
            message: 'Custom activity updated successfully',
        });
    } catch (error) {
        console.error('Error in custom activities PATCH:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// ============================================================================
// DELETE Handler - Delete a custom activity (soft delete)
// ============================================================================

export async function DELETE(request: NextRequest) {
    try {
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const supabase = getSupabaseServiceRole();
        const body = await request.json();

        const { custom_activity_id } = body;

        if (!custom_activity_id) {
            return NextResponse.json(
                { error: 'custom_activity_id is required' },
                { status: 400 }
            );
        }

        // Verify ownership
        const { data: existing } = await supabase
            .from('custom_activities')
            .select('created_by')
            .eq('custom_activity_id', custom_activity_id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { error: 'Custom activity not found' },
                { status: 404 }
            );
        }

        if (existing.created_by !== userId) {
            return NextResponse.json(
                { error: 'You can only delete your own custom activities' },
                { status: 403 }
            );
        }

        // Soft delete - set is_active to false
        const { error: deleteError } = await supabase
            .from('custom_activities')
            .update({ is_active: false, modified_by: userId, modified_date: new Date().toISOString() })
            .eq('custom_activity_id', custom_activity_id);

        if (deleteError) {
            console.error('Error deleting custom activity:', deleteError);
            return NextResponse.json(
                { error: 'Failed to delete custom activity' },
                { status: 500 }
            );
        }

        // Also remove from any leagues
        await supabase
            .from('leagueactivities')
            .delete()
            .eq('custom_activity_id', custom_activity_id);

        return NextResponse.json({
            success: true,
            message: 'Custom activity deleted successfully',
        });
    } catch (error) {
        console.error('Error in custom activities DELETE:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
