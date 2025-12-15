import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import {
  getAllRoles,
  createRole,
} from '@/lib/services/admin';
import type { AdminRoleFilters, AdminRoleCreateInput } from '@/types/admin';

/**
 * GET /api/admin/roles
 * Get all roles with optional filters
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
    const filters: AdminRoleFilters = {
      search: searchParams.get('search') || undefined,
    };

    const roles = await getAllRoles(filters);
    return NextResponse.json({ data: roles });
  } catch (error) {
    console.error('Error in admin roles GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/roles
 * Create a new role
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

    const body = await req.json();
    const { role_name } = body;

    if (!role_name) {
      return NextResponse.json(
        { error: 'Role name is required' },
        { status: 400 }
      );
    }

    const input: AdminRoleCreateInput = {
      role_name,
    };

    const adminUserId = (session.user as any)?.id;
    const role = await createRole(input, adminUserId);

    if (!role) {
      return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
    }

    return NextResponse.json({ data: role }, { status: 201 });
  } catch (error) {
    console.error('Error in admin roles POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
