import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import {
  getActivityById,
  updateActivity,
  deleteActivity,
} from '@/lib/services/admin';
import type { AdminActivityUpdateInput } from '@/types/admin';

interface RouteParams {
  params: Promise<{ activityId: string }>;
}

/**
 * GET /api/admin/activities/[activityId]
 * Get a single activity by ID
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.platform_role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { activityId } = await params;
    const activity = await getActivityById(activityId);

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json({ data: activity });
  } catch (error) {
    console.error('Error in admin activity GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/activities/[activityId]
 * Update an activity
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.platform_role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { activityId } = await params;
    const body = await req.json();

    const input: AdminActivityUpdateInput = {};

    if (body.activity_name !== undefined) input.activity_name = body.activity_name;
    if (body.description !== undefined) input.description = body.description;
    if (body.category_id !== undefined) input.category_id = body.category_id;
    if (body.measurement_type !== undefined) {
      const allowed = ['duration', 'distance', 'hole', 'steps'];
      if (!allowed.includes(body.measurement_type)) {
        return NextResponse.json({ error: 'Invalid measurement_type' }, { status: 400 });
      }
      input.measurement_type = body.measurement_type;
    }

    // Handle secondary measurement type
    if (body.secondary_measurement_type !== undefined) {
      const allowed = ['duration', 'distance', 'hole', 'steps'];
      // Allow passing null or empty string to clear it
      if (body.secondary_measurement_type) {
        if (!allowed.includes(body.secondary_measurement_type)) {
          return NextResponse.json({ error: 'Invalid secondary_measurement_type' }, { status: 400 });
        }

        // Fetch current activity to check if secondary matches primary (if primary isn't being updated)
        if (!input.measurement_type) {
          const currentActivity = await getActivityById(activityId);
          if (currentActivity?.measurement_type === body.secondary_measurement_type) {
            return NextResponse.json({ error: 'Secondary measurement type cannot be the same as primary' }, { status: 400 });
          }
        } else if (input.measurement_type === body.secondary_measurement_type) {
          return NextResponse.json({ error: 'Secondary measurement type cannot be the same as primary' }, { status: 400 });
        }

        // Merge into settings
        // Note: For a partial update, we might ideally want to merge with existing settings.
        // But for now, we'll assume we are setting the specific key. 
        // A safer way is to fetch existing settings first if we want to preserve other keys.
        // Given we only use settings for this feature right now, constructing a new object is okay,
        // BUT to be safe let's fetch first if we can, or just set it. 
        // For simplicity in this Admin API pattern, we will fetch existing activity first if we want to act properly partial,
        // but `updateActivity` in service just replaces fields. 
        // Let's implement robustly: We will fetch the activity first to get current settings.

        const currentActivity = await getActivityById(activityId);
        const currentSettings = currentActivity?.settings || {};

        input.settings = {
          ...currentSettings,
          secondary_measurement_type: body.secondary_measurement_type
        };
      } else {
        // Clearing it
        const currentActivity = await getActivityById(activityId);
        const currentSettings = currentActivity?.settings || {};
        const newSettings = { ...currentSettings };
        delete newSettings.secondary_measurement_type;
        input.settings = newSettings;
      }
    }

    if (body.admin_info !== undefined) input.admin_info = body.admin_info;

    const adminUserId = (session.user as any)?.id;
    // FIX: Pass undefined for accessToken (2nd arg), adminUserId for modifiedBy (3rd arg)
    // The service signature is: updateActivity(id, input, accessToken, modifiedBy)
    const activity = await updateActivity(activityId, input, undefined, adminUserId);

    if (!activity) {
      return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 });
    }

    return NextResponse.json({ data: activity });
  } catch (error) {
    console.error('Error in admin activity PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/activities/[activityId]
 * Delete an activity (hard delete since no is_active field)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.platform_role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { activityId } = await params;
    const success = await deleteActivity(activityId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete activity. It may be in use by leagues.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    console.error('Error in admin activity DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
