import { LeagueRole } from '@/contexts/league-context';

// ============================================================================
// Route Permission Configuration
// ============================================================================

/**
 * Defines which roles can access each route pattern.
 * Routes not listed here are accessible by all authenticated users.
 */
const routePermissions: Record<string, LeagueRole[]> = {
  // Captain-level routes
  '/leagues/[id]/team/manage': ['captain', 'governor', 'host'],
  '/leagues/[id]/validate': ['captain', 'governor', 'host'],

  // Governor-level routes
  '/leagues/[id]/teams': ['governor', 'host'],
  '/leagues/[id]/submissions': ['governor', 'host'],
  '/leagues/[id]/members': ['governor', 'host'],

  // Host-only routes
  '/leagues/[id]/settings': ['host'],
  '/leagues/[id]/governors': ['host'],
  '/leagues/[id]/analytics': ['host'],
  '/leagues/[id]/edit': ['host'],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a dynamic route to a pattern
 * e.g., /leagues/123/settings -> /leagues/[id]/settings
 */
function routeToPattern(path: string): string {
  // Replace UUID-like segments with [id]
  return path.replace(
    /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    '/[id]'
  );
}

/**
 * Check if a user with the given role can access a specific route
 */
export function canAccessRoute(
  role: LeagueRole | null,
  pathname: string
): boolean {
  if (!role) return false;

  const pattern = routeToPattern(pathname);
  const allowedRoles = routePermissions[pattern];

  // If no permission defined, allow access
  if (!allowedRoles) return true;

  return allowedRoles.includes(role);
}

/**
 * Get the required roles for a route
 */
export function getRequiredRoles(pathname: string): LeagueRole[] | null {
  const pattern = routeToPattern(pathname);
  return routePermissions[pattern] || null;
}

/**
 * Check if a route requires specific permissions
 */
export function isProtectedRoute(pathname: string): boolean {
  const pattern = routeToPattern(pathname);
  return pattern in routePermissions;
}

/**
 * Get the minimum role required for a route
 */
export function getMinimumRole(pathname: string): LeagueRole | null {
  const required = getRequiredRoles(pathname);
  if (!required) return null;

  // Role hierarchy (lowest to highest)
  const hierarchy: LeagueRole[] = ['player', 'captain', 'governor', 'host'];

  // Find the lowest role in the hierarchy that's allowed
  for (const role of hierarchy) {
    if (required.includes(role)) {
      return role;
    }
  }

  return null;
}

export default canAccessRoute;
