import {
  LayoutDashboard,
  Trophy,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  Target,
  Flag,
  Shield,
  Crown,
  Dumbbell,
  Plus,
  Search,
  CreditCard,
  Activity,
  UserCheck,
  Eye,
  Gift,
  HeartHandshake,
  LucideIcon,
  BookOpen,
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type LeagueRole = 'host' | 'governor' | 'captain' | 'player';

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
  isActive?: boolean;
  /** If true, item is view-only (visual indicator) */
  viewOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
  /** Role required to see this section */
  roles?: LeagueRole[];
}

export interface SidebarConfig {
  sections: NavSection[];
}

// ============================================================================
// Base Navigation (No League Selected)
// ============================================================================

const baseNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'My Leagues',
    url: '/leagues',
    icon: Trophy,
  },
  {
    title: 'Payments',
    url: '/payments',
    icon: CreditCard,
  },
];

// ============================================================================
// Role-Based Navigation Configuration
// ============================================================================

/**
 * Get sidebar configuration based on user's role in the league
 *
 * Hierarchy:
 * - Main: Dashboard, Payments (always visible)
 * - League: Role-appropriate league features
 * - Oversight: Host/Governor submission validation
 * - My Team: Captain's team management
 * - Player: Submit activity, view team (if user is also a player)
 */
export function getSidebarNavItems(
  role: LeagueRole | null,
  leagueId: string | null,
  options?: {
    /** Whether host/governor is also participating as a player */
    isAlsoPlayer?: boolean;
  }
): NavSection[] {
  // No league selected - show base navigation
  if (!leagueId || !role) {
    return [
      {
        title: 'Navigation',
        items: baseNavItems,
      },
    ];
  }

  const { isAlsoPlayer = false } = options || {};
  const sections: NavSection[] = [];

  // Helper to build league URLs
  const leagueUrl = (path: string) => `/leagues/${leagueId}${path}`;

  // ========================================
  // MAIN Section (All Roles)
  // ========================================
  sections.push({
    title: 'Main',
    items: [
      {
        title: 'Dashboard',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Payments',
        url: '/payments',
        icon: CreditCard,
      },
    ],
  });

  // ========================================
  // PLAYER Section
  // - Always shown for Captain (captain is always a player per PRD)
  // - Shown for Host/Governor only if isAlsoPlayer is true
  // - Always shown for Player role
  // ========================================
  const showPlayerSection =
    role === 'player' ||
    role === 'captain' ||
    role === 'host' ||
    role === 'governor';

  if (showPlayerSection) {
    sections.push({
      title: 'Player',
      items: [
        {
          title: 'My Activities',
          url: leagueUrl('/my-submissions'),
          icon: ClipboardCheck,
        },
        {
          title: 'Submit Activity',
          url: leagueUrl('/submit'),
          icon: Dumbbell,
        },
        {
          title: 'My Team',
          url: leagueUrl('/my-team-view'),
          icon: Eye,
        },
      ],
    });
  }

  // ========================================
  // LEAGUE Section (Role-specific items)
  // ========================================
  const leagueItems: NavItem[] = [
    {
      title: 'League Dashboard',
      url: leagueUrl(''),
      icon: Trophy,
      viewOnly: role === 'player',
    },
  ];

  // Team Management - Host & Governor only
  if (role === 'host' || role === 'governor') {
    leagueItems.push(
      {
        title: 'Team Management',
        url: leagueUrl('/team'),
        icon: Users,
      },
      {
        title: 'Activities',
        url: leagueUrl('/activities'),
        icon: Activity,
      }
    );
  }

  // League Settings - Host only
  if (role === 'host') {
    leagueItems.push({
      title: 'League Settings',
      url: leagueUrl('/settings'),
      icon: Settings,
    });
  }

  // Common league items for all roles
  // Common league items for all roles
  leagueItems.push(
    {
      title: 'Rules',
      url: leagueUrl('/rules'),
      icon: BookOpen,
    },
    {
      title: 'Leaderboard',
      url: leagueUrl('/leaderboard'),
      icon: BarChart3,
    },
    {
      title: 'Challenges',
      url: leagueUrl('/challenges'),
      icon: Flag,
      viewOnly: role === 'governor' || role === 'player',
    }
  );

  sections.push({
    title: 'League',
    items: leagueItems,
  });

  // ========================================
  // OVERSIGHT Section (Host & Governor)
  // For validating submissions across all teams
  // ========================================
  if (role === 'host' || role === 'governor') {
    sections.push({
      title: 'Oversight',
      items: [
        {
          title: 'All Activities',
          url: leagueUrl('/submissions'),
          icon: ClipboardCheck,
        },
        {
          title: 'Manual Workout Entry',
          url: leagueUrl('/manual-entry'),
          icon: UserCheck,
        },
        {
          title: 'Approve Donations',
          url: leagueUrl('/rest-day-donations'),
          icon: HeartHandshake,
        },
      ],
    });
  }

  // ========================================
  // MY TEAM Section (Captain only)
  // Captain can only manage their own team
  // ========================================
  if (role === 'captain') {
    sections.push({
      title: 'My Team',
      items: [
        {
          title: 'Team Overview',
          url: leagueUrl('/my-team'),
          icon: Users,
        },
        {
          title: 'Team Activities',
          url: leagueUrl('/my-team/submissions'),
          icon: ClipboardCheck,
        },
        {
          title: 'Approve Donations',
          url: leagueUrl('/rest-day-donations'),
          icon: HeartHandshake,
        },
      ],
    });
  }

  return sections;
}

// ============================================================================
// Mobile Bottom Tab Configuration
// ============================================================================

export function getMobileTabItems(
  role: LeagueRole | null,
  leagueId: string | null,
  options?: {
    isAlsoPlayer?: boolean;
  }
): NavItem[] {
  // No league - basic tabs
  if (!leagueId || !role) {
    return [
      {
        title: 'Home',
        url: '/dashboard',
        icon: LayoutDashboard,
      },
      {
        title: 'Leagues',
        url: '/leagues',
        icon: Trophy,
      },
      {
        title: 'Join',
        url: '/leagues/join',
        icon: Search,
      },
      {
        title: 'Create',
        url: '/leagues/create',
        icon: Plus,
      },
    ];
  }

  const { isAlsoPlayer = false } = options || {};
  const leagueUrl = (path: string) => `/leagues/${leagueId}${path}`;

  // Base tabs for all roles
  const tabs: NavItem[] = [
    {
      title: 'League',
      url: leagueUrl(''),
      icon: Trophy,
    },
    {
      title: 'Leaderboard',
      url: leagueUrl('/leaderboard'),
      icon: BarChart3,
    },
  ];

  // Role-specific tabs
  if (role === 'host' || role === 'governor') {
    tabs.push({
      title: 'Teams',
      url: leagueUrl('/team'),
      icon: Users,
    });
    tabs.push({
      title: 'Validate',
      url: leagueUrl('/submissions'),
      icon: ClipboardCheck,
    });
  } else if (role === 'captain') {
    tabs.push({
      title: 'My Team',
      url: leagueUrl('/my-team'),
      icon: Users,
    });
    tabs.push({
      title: 'Validate',
      url: leagueUrl('/my-team/submissions'),
      icon: ClipboardCheck,
    });
  }

  // Submit tab for players (and hosts/governors)
  const showSubmit =
    role === 'player' ||
    role === 'captain' ||
    role === 'host' ||
    role === 'governor';

  if (showSubmit) {
    tabs.push({
      title: 'Submit',
      url: leagueUrl('/submit'),
      icon: Dumbbell,
    });
  }

  // Limit to 5 tabs max for mobile
  return tabs.slice(0, 5);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if user has elevated permissions (can manage league)
 */
export function canManageLeague(role: LeagueRole | null): boolean {
  return role === 'host' || role === 'governor';
}

/**
 * Check if user can validate submissions
 */
export function canValidateSubmissions(role: LeagueRole | null): boolean {
  return role === 'host' || role === 'governor' || role === 'captain';
}

/**
 * Check if user can access all teams (not just their own)
 */
export function canAccessAllTeams(role: LeagueRole | null): boolean {
  return role === 'host' || role === 'governor';
}

/**
 * Check if user can modify league settings
 */
export function canModifyLeagueSettings(role: LeagueRole | null): boolean {
  return role === 'host';
}

/**
 * Get role display information
 */
export function getRoleDisplay(role: LeagueRole): {
  label: string;
  icon: LucideIcon;
  color: string;
} {
  const roleConfig: Record<LeagueRole, { label: string; icon: LucideIcon; color: string }> = {
    host: {
      label: 'Host',
      icon: Crown,
      color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30',
    },
    governor: {
      label: 'Governor',
      icon: Shield,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
    captain: {
      label: 'Captain',
      icon: Target,
      color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    },
    player: {
      label: 'Player',
      icon: Dumbbell,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
  };

  return roleConfig[role];
}

export default getSidebarNavItems;
