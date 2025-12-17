import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import {
  getRoleById,
  updateRole,
  deleteRole,
  isSystemRole,
} from '@/lib/services/admin';
import type { AdminRoleUpdateInput } from '@/types/admin';

interface RouteParams {
  params: Promise<{ roleId: string }>;
}

/**
 * GET /api/admin/roles/[roleId]
 * Get a single role by ID
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

    const { roleId } = await params;
    const role = await getRoleById(roleId);

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    return NextResponse.json({ data: role });
  } catch (error) {
    console.error('Error in admin role GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/roles/[roleId]
 * Update a role
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

    const { roleId } = await params;

    // Check if it's a system role
    const existingRole = await getRoleById(roleId);
    if (existingRole && isSystemRole(existingRole.role_name)) {
      return NextResponse.json(
        { error: 'System roles cannot be modified' },
        { status: 400 }
      );
    }

    const body = await req.json();

    const input: AdminRoleUpdateInput = {};

    if (body.role_name !== undefined) input.role_name = body.role_name;

    const adminUserId = (session.user as any)?.id;
    const role = await updateRole(roleId, input, adminUserId);

    if (!role) {
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }

    return NextResponse.json({ data: role });
  } catch (error) {
    console.error('Error in admin role PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/roles/[roleId]
 * Delete a role (hard delete)
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

    const { roleId } = await params;
    const result = await deleteRole(roleId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to delete role' },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error in admin role DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
