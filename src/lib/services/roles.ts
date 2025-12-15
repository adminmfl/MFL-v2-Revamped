/**
 * Roles Service Layer
 * Handles role management, custom roles, and role-based permissions.
 */

import { getSupabase } from '@/lib/supabase/client';

export interface Role {
  role_id: string;
  role_name: string;
  created_by: string;
  created_date: string;
  modified_by: string;
  modified_date: string;
}

/**
 * Get all available roles in the system
 * @returns Array of roles
 */
export async function getAllRoles(): Promise<Role[]> {
  try {
    const { data, error } = await getSupabase()
      .from('roles')
      .select('*');

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    return data as Role[];
  } catch (err) {
    console.error('Error in getAllRoles:', err);
    return [];
  }
}

/**
 * Get a role by name
 * @param roleName - Role name (e.g., 'host', 'governor', 'captain', 'player')
 * @returns Role object or null
 */
export async function getRoleByName(roleName: string): Promise<Role | null> {
  try {
    const { data, error } = await getSupabase()
      .from('roles')
      .select('*')
      .eq('role_name', roleName)
      .single();

    if (error) return null;
    return data as Role;
  } catch (err) {
    console.error('Error fetching role:', err);
    return null;
  }
}

/**
 * Create a custom role
 * @param roleName - Name of the role
 * @param createdBy - User ID creating the role
 * @returns Created role or null
 */
export async function createRole(roleName: string, createdBy: string): Promise<Role | null> {
  try {
    // Check if role already exists
    const existing = await getRoleByName(roleName);
    if (existing) {
      console.warn('Role already exists:', roleName);
      return existing;
    }

    const { data, error } = await getSupabase()
      .from('roles')
      .insert({
        role_name: roleName,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating role:', error);
      return null;
    }

    return data as Role;
  } catch (err) {
    console.error('Error in createRole:', err);
    return null;
  }
}

/**
 * Initialize default roles if they don't exist
 * Default roles: host, governor, captain, player
 */
export async function initializeDefaultRoles(): Promise<void> {
  try {
    const defaultRoles = ['host', 'governor', 'captain', 'player'];

    for (const roleName of defaultRoles) {
      const existing = await getRoleByName(roleName);
      if (!existing) {
        await createRole(roleName, 'system');
      }
    }

    console.log('Default roles initialized');
  } catch (err) {
    console.error('Error initializing default roles:', err);
  }
}

/**
 * Check if user has a specific role in a league
 * @param userId - User ID
 * @param leagueId - League ID
 * @param roleName - Role name to check
 * @returns Boolean indicating if user has the role
 */
export async function userHasRole(
  userId: string,
  leagueId: string,
  roleName: string
): Promise<boolean> {
  try {
    const { data, error } = await getSupabase()
      .from('assignedrolesforleague')
      .select('id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .in('role_id', [
        // Get role_id for the given role_name
        (await getSupabase()
          .from('roles')
          .select('role_id')
          .eq('role_name', roleName)
          .single()
          .then((res) => res.data?.role_id || null)),
      ])
      .maybeSingle();

    return !!data;
  } catch (err) {
    console.error('Error checking user role:', err);
    return false;
  }
}

/**
 * Check if user has any of the specified roles in a league (OR logic)
 * @param userId - User ID
 * @param leagueId - League ID
 * @param roleNames - Array of role names to check
 * @returns Boolean indicating if user has any of the roles
 */
export async function userHasAnyRole(
  userId: string,
  leagueId: string,
  roleNames: string[]
): Promise<boolean> {
  try {
    const userRoles = await getSupabase()
      .from('assignedrolesforleague')
      .select('roles(role_name)')
      .eq('user_id', userId)
      .eq('league_id', leagueId);

    if (userRoles.error) return false;

    const assignedRoleNames = (userRoles.data || []).map((row: any) => row.roles?.role_name);
    return roleNames.some((roleName) => assignedRoleNames.includes(roleName));
  } catch (err) {
    console.error('Error checking user roles:', err);
    return false;
  }
}

/**
 * Check if user has all of the specified roles in a league (AND logic)
 * @param userId - User ID
 * @param leagueId - League ID
 * @param roleNames - Array of role names to check
 * @returns Boolean indicating if user has all the roles
 */
export async function userHasAllRoles(
  userId: string,
  leagueId: string,
  roleNames: string[]
): Promise<boolean> {
  try {
    const userRoles = await getSupabase()
      .from('assignedrolesforleague')
      .select('roles(role_name)')
      .eq('user_id', userId)
      .eq('league_id', leagueId);

    if (userRoles.error) return false;

    const assignedRoleNames = new Set((userRoles.data || []).map((row: any) => row.roles?.role_name));
    return roleNames.every((roleName) => assignedRoleNames.has(roleName));
  } catch (err) {
    console.error('Error checking user roles:', err);
    return false;
  }
}

/**
 * Get role hierarchy level (for permission comparison)
 * Higher level = more permissions
 * @param roleName - Role name
 * @returns Hierarchy level (higher = more permissions)
 */
export function getRoleHierarchyLevel(roleName: string): number {
  const hierarchy: Record<string, number> = {
    player: 0,
    captain: 1,
    governor: 2,
    host: 3,
  };

  return hierarchy[roleName] ?? -1; // -1 for unknown roles
}

/**
 * Check if user can perform an action on another user's role
 * General rule: Higher role can manage lower roles
 * @param userRole - User's role
 * @param targetRole - Target's role
 * @returns Boolean indicating if user can manage target role
 */
export function canManageRole(userRole: string, targetRole: string): boolean {
  return getRoleHierarchyLevel(userRole) > getRoleHierarchyLevel(targetRole);
}
