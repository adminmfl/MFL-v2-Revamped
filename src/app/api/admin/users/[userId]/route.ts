import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import {
  getUserById,
  updateUser,
  softDeleteUser,
} from '@/lib/services/admin';
import type { AdminUserUpdateInput } from '@/types/admin';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/admin/users/[userId]
 * Get a single user by ID
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

    const { userId } = await params;
    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('Error in admin user GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[userId]
 * Update a user
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

    const { userId } = await params;
    const body = await req.json();

    const input: AdminUserUpdateInput = {};

    if (body.username !== undefined) input.username = body.username;
    if (body.email !== undefined) input.email = body.email.toLowerCase();
    if (body.phone !== undefined) input.phone = body.phone;
    if (body.date_of_birth !== undefined) input.date_of_birth = body.date_of_birth;
    if (body.gender !== undefined) input.gender = body.gender;
    if (body.platform_role !== undefined) input.platform_role = body.platform_role;
    if (body.is_active !== undefined) input.is_active = body.is_active;

    const adminUserId = (session.user as any)?.id;
    const user = await updateUser(userId, input, adminUserId);

    if (!user) {
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error('Error in admin user PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[userId]
 * Soft delete a user (set is_active = false)
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

    const { userId } = await params;
    const adminUserId = (session.user as any)?.id;

    // Prevent self-deletion
    if (userId === adminUserId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    const success = await softDeleteUser(userId, adminUserId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error in admin user DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
