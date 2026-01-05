import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import {
  getAllActivities,
  createActivity,
} from '@/lib/services/admin';
import type { AdminActivityFilters, AdminActivityCreateInput } from '@/types/admin';

/**
 * GET /api/admin/activities
 * Get all activities with optional filters
 */
export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.platform_role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filters: AdminActivityFilters = {
      search: searchParams.get('search') || undefined,
      category_id: searchParams.get('category_id') || undefined,
    };

    const activities = await getAllActivities(filters);
    return NextResponse.json({ data: activities });
  } catch (error) {
    console.error('Error in admin activities GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/activities
 * Create a new activity
 */
export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.platform_role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      activity_name,
      description,
      category_id,
      measurement_type,
      secondary_measurement_type, // New field from frontend
      admin_info,
    } = body;

    if (!activity_name) {
      return NextResponse.json(
        { error: 'Activity name is required' },
        { status: 400 }
      );
    }

    if (!category_id) {
      return NextResponse.json(
        { error: 'Category is required' },
        { status: 400 }
      );
    }

    const allowedMeasurements = ['duration', 'distance', 'hole', 'steps'];
    if (!measurement_type || !allowedMeasurements.includes(measurement_type)) {
      return NextResponse.json(
        { error: 'measurement_type is required and must be one of duration|distance|hole|steps' },
        { status: 400 }
      );
    }

    // Validate secondary measurement type if provided
    let settings: Record<string, any> = {};
    if (secondary_measurement_type) {
      if (!allowedMeasurements.includes(secondary_measurement_type)) {
        return NextResponse.json(
          { error: 'Secondary measurement type must be one of duration|distance|hole|steps' },
          { status: 400 }
        );
      }
      if (secondary_measurement_type === measurement_type) {
        return NextResponse.json(
          { error: 'Secondary measurement type cannot be the same as primary' },
          { status: 400 }
        );
      }
      settings.secondary_measurement_type = secondary_measurement_type;
    }

    const input: AdminActivityCreateInput = {
      activity_name,
      description: description || null,
      category_id,
      measurement_type,
      settings: Object.keys(settings).length > 0 ? settings : null,
      admin_info: admin_info || null,
    };

    const adminUserId = (session.user as any)?.id;
    // Pass adminUserId as createdBy (third arg). Do not treat it as access token.
    const activity = await createActivity(input, undefined, adminUserId);

    if (!activity) {
      return NextResponse.json({ error: 'Failed to create activity' }, { status: 500 });
    }

    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (error) {
    console.error('Error in admin activities POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
