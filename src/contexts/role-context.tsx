'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLeague, LeagueRole } from './league-context';

// ============================================================================
// Types
// ============================================================================

// Re-export for convenience
export type Role = LeagueRole;

interface RoleContextType {
  activeRole: Role | null;
  availableRoles: Role[];
  setActiveRole: (role: Role) => void;
  isLoading: boolean;
  // Permission helpers
  isHost: boolean;
  isGovernor: boolean;
  isCaptain: boolean;
  isPlayer: boolean;
  canManageLeague: boolean;
  canValidateSubmissions: boolean;
  canManageTeam: boolean;
}

// ============================================================================
// Role Hierarchy
// ============================================================================

const roleHierarchy: Role[] = ['player', 'captain', 'governor', 'host'];

/**
 * Get the highest role from a list of roles
 */
function getHighestRole(roles: Role[]): Role | null {
  if (roles.length === 0) return null;

  let highest = roles[0];
  let highestLevel = roleHierarchy.indexOf(highest);

  for (const role of roles) {
    const level = roleHierarchy.indexOf(role);
    if (level > highestLevel) {
      highest = role;
      highestLevel = level;
    }
  }

  return highest;
}

// ============================================================================
// Context
// ============================================================================

const RoleContext = createContext<RoleContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface RoleProviderProps {
  children: ReactNode;
}

/**
 * RoleProvider - Manages user roles within the active league context.
 *
 * Features:
 * - Automatically syncs with LeagueContext
 * - Provides role switching for multi-role users
 * - Calculates permission helpers
 * - Persists active role selection per league
 */
export function RoleProvider({ children }: RoleProviderProps) {
  const { activeLeague, isLoading: leagueLoading } = useLeague();
  const [activeRole, setActiveRoleState] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get available roles from active league
  const availableRoles: Role[] = activeLeague?.roles || [];

  // Sync active role when league changes
  useEffect(() => {
    if (leagueLoading) {
      setIsLoading(true);
      return;
    }

    if (!activeLeague || availableRoles.length === 0) {
      setActiveRoleState(null);
      setIsLoading(false);
      return;
    }

    // Try to restore saved role for this league
    const savedRole = localStorage.getItem(`activeRole_${activeLeague.league_id}`);
    if (savedRole && availableRoles.includes(savedRole as Role)) {
      setActiveRoleState(savedRole as Role);
    } else {
      // Default to highest role
      const highest = getHighestRole(availableRoles);
      setActiveRoleState(highest);
      if (highest && activeLeague) {
        localStorage.setItem(`activeRole_${activeLeague.league_id}`, highest);
      }
    }

    setIsLoading(false);
  }, [activeLeague, leagueLoading, availableRoles]);

  // Set active role with persistence
  const setActiveRole = useCallback((role: Role) => {
    if (availableRoles.includes(role)) {
      setActiveRoleState(role);
      if (activeLeague) {
        localStorage.setItem(`activeRole_${activeLeague.league_id}`, role);
      }
    }
  }, [availableRoles, activeLeague]);

  // Permission helpers
  const isHost = activeRole === 'host';
  const isGovernor = activeRole === 'governor' || isHost;
  const isCaptain = activeRole === 'captain' || isGovernor;
  const isPlayer = activeRole === 'player' || isCaptain;

  const canManageLeague = isHost;
  const canValidateSubmissions = isHost || activeRole === 'governor' || activeRole === 'captain';
  const canManageTeam = isCaptain;

  return (
    <RoleContext.Provider
      value={{
        activeRole,
        availableRoles,
        setActiveRole,
        isLoading: isLoading || leagueLoading,
        isHost,
        isGovernor,
        isCaptain,
        isPlayer,
        canManageLeague,
        canValidateSubmissions,
        canManageTeam,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}

export default RoleProvider;
