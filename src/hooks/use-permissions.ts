'use client';

import { useRole } from '@/contexts/role-context';
import { can, permissions } from '@/lib/rbac/permissions';

/**
 * Hook for checking permissions in components
 * Usage: const { can, role } = usePermissions();
 * if (can('createLeague')) { ... }
 */
export function usePermissions() {
  const { activeRole } = useRole();

  return {
    role: activeRole,
    can: (permission: keyof typeof permissions) => can(activeRole, permission),
    canCreateLeague: can(activeRole, 'createLeague'),
    canConfigureLeague: can(activeRole, 'configureLeague'),
    canDeleteLeague: can(activeRole, 'deleteLeague'),
    canLeagueWideOversight: can(activeRole, 'leagueWideOversight'),
    canValidateAnySubmission: can(activeRole, 'validateAnySubmission'),
    canValidateTeamSubmissions: can(activeRole, 'validateTeamSubmissions'),
    canOverrideCaptainApprovals: can(activeRole, 'overrideCaptainApprovals'),
    canAccessAllData: can(activeRole, 'accessAllData'),
    canValidateOwnTeamOnly: can(activeRole, 'validateOwnTeamOnly'),
    canSubmitWorkouts: can(activeRole, 'submitWorkouts'),
    canManageTeamMembers: can(activeRole, 'manageTeamMembers'),
    canViewLeaderboards: can(activeRole, 'viewLeaderboards'),
    canEditLeagueSettings: can(activeRole, 'editLeagueSettings'),
    canAssignGovernors: can(activeRole, 'assignGovernors'),
    canRemovePlayers: can(activeRole, 'removePlayers'),
  };
}
