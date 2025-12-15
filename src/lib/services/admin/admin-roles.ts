/**
 * Admin Roles Service
 * Handles all role CRUD operations for the admin panel
 */

import { getSupabaseServiceRole } from '@/lib/supabase/client';
import type {
  AdminRole,
  AdminRoleCreateInput,
  AdminRoleUpdateInput,
  AdminRoleFilters,
} from '@/types/admin';

// System roles that cannot be deleted
const SYSTEM_ROLES = ['host', 'governor', 'captain', 'player'];

/**
 * Get all roles with optional filters and user counts
 */
export async function getAllRoles(filters?: AdminRoleFilters): Promise<AdminRole[]> {
  try {
    const supabase = getSupabaseServiceRole();

    let query = supabase
      .from('roles')
      .select('*')
      .order('created_date', { ascending: true });

    // Apply search filter
    if (filters?.search) {
      query = query.ilike('role_name', `%${filters.search}%`);
    }

    const { data: roles, error } = await query;

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    if (!roles || roles.length === 0) {
      return [];
    }

    // Get user counts for all roles from assignedrolesforleague
    const roleIds = roles.map((r) => r.role_id);
    const { data: roleCounts } = await supabase
      .from('assignedrolesforleague')
      .select('role_id');

    // Count users per role
    const countMap: Record<string, number> = {};
    (roleCounts || []).forEach((r) => {
      countMap[r.role_id] = (countMap[r.role_id] || 0) + 1;
    });

    // Attach user counts to roles
    const rolesWithCounts = roles.map((role) => ({
      ...role,
      user_count: countMap[role.role_id] || 0,
    }));

    return rolesWithCounts as AdminRole[];
  } catch (err) {
    console.error('Error in getAllRoles:', err);
    return [];
  }
}

/**
 * Get a single role by ID
 */
export async function getRoleById(roleId: string): Promise<AdminRole | null> {
  try {
    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('role_id', roleId)
      .single();

    if (error) {
      console.error('Error fetching role:', error);
      return null;
    }

    // Get user count
    const { count } = await supabase
      .from('assignedrolesforleague')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);

    return {
      ...data,
      user_count: count || 0,
    } as AdminRole;
  } catch (err) {
    console.error('Error in getRoleById:', err);
    return null;
  }
}

/**
 * Create a new role
 */
export async function createRole(
  input: AdminRoleCreateInput,
  createdBy?: string
): Promise<AdminRole | null> {
  try {
    const supabase = getSupabaseServiceRole();
    const { data, error } = await supabase
      .from('roles')
      .insert({
        role_name: input.role_name.toLowerCase(),
        created_by: createdBy || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating role:', error);
      return null;
    }

    return { ...data, user_count: 0 } as AdminRole;
  } catch (err) {
    console.error('Error in createRole:', err);
    return null;
  }
}

/**
 * Update an existing role
 */
export async function updateRole(
  roleId: string,
  input: AdminRoleUpdateInput,
  modifiedBy?: string
): Promise<AdminRole | null> {
  try {
    const supabase = getSupabaseServiceRole();

    // Check if it's a system role
    const existing = await getRoleById(roleId);
    if (existing && SYSTEM_ROLES.includes(existing.role_name)) {
      console.error('Cannot update system role');
      return null;
    }

    const { data, error } = await supabase
      .from('roles')
      .update({
        role_name: input.role_name?.toLowerCase(),
        modified_by: modifiedBy || null,
        modified_date: new Date().toISOString(),
      })
      .eq('role_id', roleId)
      .select()
      .single();

    if (error) {
      console.error('Error updating role:', error);
      return null;
    }

    // Get user count
    const { count } = await supabase
      .from('assignedrolesforleague')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);

    return {
      ...data,
      user_count: count || 0,
    } as AdminRole;
  } catch (err) {
    console.error('Error in updateRole:', err);
    return null;
  }
}

/**
 * Delete a role (hard delete)
 * Note: Cannot delete system roles or roles with assigned users
 */
export async function deleteRole(roleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseServiceRole();

    // Check if it's a system role
    const existing = await getRoleById(roleId);
    if (!existing) {
      return { success: false, error: 'Role not found' };
    }

    if (SYSTEM_ROLES.includes(existing.role_name)) {
      return { success: false, error: 'Cannot delete system role' };
    }

    // Check if role has assigned users
    if (existing.user_count && existing.user_count > 0) {
      return { success: false, error: 'Cannot delete role with assigned users' };
    }

    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('role_id', roleId);

    if (error) {
      console.error('Error deleting role:', error);
      return { success: false, error: 'Failed to delete role' };
    }

    return { success: true };
  } catch (err) {
    console.error('Error in deleteRole:', err);
    return { success: false, error: 'Internal error' };
  }
}

/**
 * Check if a role is a system role
 */
export function isSystemRole(roleName: string): boolean {
  return SYSTEM_ROLES.includes(roleName.toLowerCase());
}

/**
 * Get role statistics
 */
export async function getRoleStats(): Promise<{
  total: number;
  systemRoles: number;
  customRoles: number;
}> {
  try {
    const supabase = getSupabaseServiceRole();

    const { data: roles } = await supabase.from('roles').select('role_name');

    const total = roles?.length || 0;
    const systemRoles = (roles || []).filter((r) =>
      SYSTEM_ROLES.includes(r.role_name)
    ).length;

    return {
      total,
      systemRoles,
      customRoles: total - systemRoles,
    };
  } catch (err) {
    console.error('Error in getRoleStats:', err);
    return { total: 0, systemRoles: 0, customRoles: 0 };
  }
}
