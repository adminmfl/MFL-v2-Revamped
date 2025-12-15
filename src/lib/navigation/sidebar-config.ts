import {
  LayoutDashboard,
  Trophy,
  Users,
  ClipboardCheck,
  BarChart3,
  Settings,
  UserPlus,
  Target,
  Flag,
  Shield,
  Crown,
  Dumbbell,
  Plus,
  Search,
  CreditCard,
  LucideIcon,
} from 'lucide-react';
import { LeagueRole } from '@/contexts/league-context';

// ============================================================================
// Types
// ============================================================================

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  badge?: string;
  isActive?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// ============================================================================
// Navigation Items by Context
// ============================================================================

/**
 * Base navigation items (always shown when no league is selected)
 */
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
  {
    title: 'Join League',
    url: '/leagues/join',
    icon: Search,
  },
  {
    title: 'Create League',
    url: '/leagues/create',
    icon: Plus,
  },
];

/**
 * Player navigation items (when in a league as player)
 */
const playerNavItems: NavItem[] = [
  {
    title: 'League Dashboard',
    url: '/league', // Will be replaced with /leagues/[id]
    icon: LayoutDashboard,
  },
  {
    title: 'My Progress',
    url: '/league/progress',
    icon: Dumbbell,
  },
  {
    title: 'My Team',
    url: '/league/team',
    icon: Users,
  },
  {
    title: 'Leaderboard',
    url: '/league/leaderboard',
    icon: BarChart3,
  },
  {
    title: 'Challenges',
    url: '/league/challenges',
    icon: Flag,
  },
  {
    title: 'Submit Activity',
    url: '/league/submit',
    icon: ClipboardCheck,
  },
];

/**
 * Captain-specific navigation items
 */
const captainNavItems: NavItem[] = [
  {
    title: 'Team Management',
    url: '/league/team/manage',
    icon: Shield,
  },
  {
    title: 'Validate Submissions',
    url: '/league/validate',
    icon: ClipboardCheck,
  },
];

/**
 * Governor-specific navigation items
 */
const governorNavItems: NavItem[] = [
  {
    title: 'All Teams',
    url: '/league/teams',
    icon: Users,
  },
  {
    title: 'All Submissions',
    url: '/league/submissions',
    icon: ClipboardCheck,
  },
  {
    title: 'Members',
    url: '/league/members',
    icon: UserPlus,
  },
];

/**
 * Host-specific navigation items
 */
const hostNavItems: NavItem[] = [
  {
    title: 'League Settings',
    url: '/league/settings',
    icon: Settings,
  },
  {
    title: 'Manage Governors',
    url: '/league/governors',
    icon: Crown,
  },
  {
    title: 'Analytics',
    url: '/league/analytics',
    icon: Target,
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Replace /league with actual league URL
 */
function replaceLeagueUrls(items: NavItem[], leagueId: string | null): NavItem[] {
  if (!leagueId) return items;

  return items.map(item => ({
    ...item,
    url: item.url.replace('/league', `/leagues/${leagueId}`),
  }));
}

/**
 * Get sidebar navigation items based on role and league context
 */
export function getSidebarNavItems(
  role: LeagueRole | null,
  leagueId: string | null
): NavSection[] {
  // No league selected - show base navigation
  if (!leagueId) {
    return [
      {
        title: 'Navigation',
        items: baseNavItems,
      },
    ];
  }

  // Build sections based on role
  const sections: NavSection[] = [];

  // Main section - Player items (all roles get these)
  const mainItems = replaceLeagueUrls([...playerNavItems], leagueId);
  sections.push({
    title: 'Main',
    items: mainItems,
  });

  // Captain section
  if (role === 'captain' || role === 'governor' || role === 'host') {
    const teamItems = replaceLeagueUrls([...captainNavItems], leagueId);
    sections.push({
      title: 'Team Captain',
      items: teamItems,
    });
  }

  // Governor section
  if (role === 'governor' || role === 'host') {
    const govItems = replaceLeagueUrls([...governorNavItems], leagueId);
    sections.push({
      title: 'Governor',
      items: govItems,
    });
  }

  // Host section
  if (role === 'host') {
    const hostItems = replaceLeagueUrls([...hostNavItems], leagueId);
    sections.push({
      title: 'Host',
      items: hostItems,
    });
  }

  // Always add back to main dashboard
  sections.push({
    title: 'Other',
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

  return sections;
}

/**
 * Get mobile bottom tab items based on role and league context
 */
export function getMobileTabItems(
  role: LeagueRole | null,
  leagueId: string | null
): NavItem[] {
  // No league - basic tabs
  if (!leagueId) {
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

  // In league - role-based tabs
  const baseTabs: NavItem[] = [
    {
      title: 'Dashboard',
      url: `/leagues/${leagueId}`,
      icon: LayoutDashboard,
    },
    {
      title: 'Team',
      url: `/leagues/${leagueId}/team`,
      icon: Users,
    },
    {
      title: 'Submit',
      url: `/leagues/${leagueId}/submit`,
      icon: ClipboardCheck,
    },
    {
      title: 'Board',
      url: `/leagues/${leagueId}/leaderboard`,
      icon: BarChart3,
    },
  ];

  // Add validation tab for captain/governor/host
  if (role === 'captain' || role === 'governor' || role === 'host') {
    baseTabs.push({
      title: 'Validate',
      url: `/leagues/${leagueId}/validate`,
      icon: Shield,
    });
  }

  return baseTabs.slice(0, 5); // Max 5 tabs for mobile
}

export default getSidebarNavItems;
