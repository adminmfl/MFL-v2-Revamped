'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Shield } from 'lucide-react';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { RoleSwitcher } from './role-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useSession } from 'next-auth/react';

// ============================================================================
// Route Title Mapping
// ============================================================================

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/leagues': 'My Leagues',
  '/leagues/join': 'Join League',
  '/leagues/create': 'Create League',
  '/profile': 'Profile',
  '/help': 'Help & Support',
  '/payments': 'Payments',
};

// Dynamic route patterns
const dynamicRoutePatterns: [RegExp, (match: RegExpMatchArray) => string][] = [
  [/^\/leagues\/([^/]+)$/, () => 'League Dashboard'],
  [/^\/leagues\/([^/]+)\/team$/, () => 'Team Management'],
  [/^\/leagues\/([^/]+)\/my-team$/, () => 'My Team'],
  [/^\/leagues\/([^/]+)\/my-team-view$/, () => 'My Team'],
  [/^\/leagues\/([^/]+)\/team\/manage$/, () => 'Team Management'],
  [/^\/leagues\/([^/]+)\/leaderboard$/, () => 'Leaderboard'],
  [/^\/leagues\/([^/]+)\/submit$/, () => 'Submit Activity'],
  [/^\/leagues\/([^/]+)\/manual-entry$/, () => 'Manual Workout Entry'],
  [/^\/leagues\/([^/]+)\/validate$/, () => 'Validate Activities'],
  [/^\/leagues\/([^/]+)\/teams$/, () => 'All Teams'],
  [/^\/leagues\/([^/]+)\/submissions$/, () => 'All Activities'],
  [/^\/leagues\/([^/]+)\/members$/, () => 'Members'],
  [/^\/leagues\/([^/]+)\/settings$/, () => 'League Settings'],
  [/^\/leagues\/([^/]+)\/governors$/, () => 'Manage Governors'],
  [/^\/leagues\/([^/]+)\/analytics$/, () => 'Analytics'],
  [/^\/leagues\/([^/]+)\/progress$/, () => 'My Progress'],
  [/^\/leagues\/([^/]+)\/edit$/, () => 'Edit League'],
  [/^\/leagues\/([^/]+)\/challenges$/, () => 'Challenges'],
  [/^\/leagues\/([^/]+)\/activities$/, () => 'Activities'],
  [/^\/leagues\/([^/]+)\/my-team\/submissions$/, () => 'Team Activities'],
  [/^\/leagues\/([^/]+)\/rest-day-donations$/, () => 'Approve Donations'],
  [/^\/leagues\/([^/]+)\/rules$/, () => 'Rules'],
];

// ============================================================================
// Helper Functions
// ============================================================================

function getPageTitle(pathname: string | null): string {
  if (!pathname) return 'Dashboard';

  // Check static routes first
  if (routeTitles[pathname]) {
    return routeTitles[pathname];
  }

  // Check dynamic patterns
  for (const [pattern, titleFn] of dynamicRoutePatterns) {
    const match = pathname.match(pattern);
    if (match) {
      return titleFn(match);
    }
  }

  return 'Dashboard';
}

function getBreadcrumbs(
  pathname: string | null,
  leagueName?: string | null
): { label: string; href: string }[] {
  if (!pathname) return [];

  const breadcrumbs: { label: string; href: string }[] = [];

  // Parse path segments
  const segments = pathname.split('/').filter(Boolean);

  // Don't add Home breadcrumb if we're already on main-dashboard
  if (pathname !== '/dashboard') {
    breadcrumbs.push({ label: 'Home', href: '/dashboard' });
  }

  if (segments[0] === 'main-dashboard') {
    breadcrumbs.push({ label: 'Dashboard', href: '/dashboard' });
  } else if (segments[0] === 'leagues' && segments.length > 1) {
    // We're in a league context
    const leagueId = segments[1];

    if (segments[1] === 'join') {
      breadcrumbs.push({ label: 'Join League', href: '/leagues/join' });
    } else if (segments[1] === 'create') {
      breadcrumbs.push({ label: 'Create League', href: '/leagues/create' });
    } else {
      // Specific league
      breadcrumbs.push({
        label: leagueName || 'League',
        href: `/leagues/${leagueId}`,
      });

      // Add sub-page if present
      if (segments.length > 2) {
        const subPath = segments.slice(2).join('/');
        const fullPath = `/leagues/${leagueId}/${subPath}`;
        const title = getPageTitle(fullPath);
        breadcrumbs.push({ label: title, href: fullPath });
      }
    }
  } else if (segments[0] === 'profile') {
    breadcrumbs.push({ label: 'Profile', href: '/profile' });
  } else if (routeTitles[pathname] && pathname !== '/dashboard') {
    breadcrumbs.push({ label: routeTitles[pathname], href: pathname });
  }

  return breadcrumbs;
}

// ============================================================================
// AppHeader Component
// ============================================================================

// Role colors for text
const roleTextColors: Record<string, string> = {
  host: 'text-amber-600',
  governor: 'text-blue-600',
  captain: 'text-emerald-600',
  player: 'text-gray-600',
};

export function AppHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { activeLeague } = useLeague();
  const { activeRole } = useRole();

  const pageTitle = getPageTitle(pathname);
  const breadcrumbs = getBreadcrumbs(pathname, activeLeague?.name);

  // Check if user is admin (for admin panel link)
  const isAdmin = (session?.user as any)?.platform_role === 'admin';

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Sidebar Toggle */}
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />

        {/* Breadcrumb Navigation */}
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={`${crumb.href}-${index}`}>
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Mobile Title */}
        <h1 className="text-base font-medium sm:hidden">{pageTitle}</h1>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-2">
          {activeLeague && (
            <Button variant="ghost" size="sm" asChild className="flex gap-2 px-2 sm:px-4 h-auto py-1">
              <Link href={`/leagues/${activeLeague.league_id}`}>
                <Avatar className="size-8 sm:size-9 rounded-md">
                  {activeLeague.logo_url ? (
                    <AvatarImage src={activeLeague.logo_url} alt={activeLeague.name} />
                  ) : (
                    <AvatarFallback className="rounded-md bg-primary/10 text-primary font-semibold text-xs sm:text-sm">
                      {activeLeague.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex flex-col items-start leading-none gap-1">
                  <span className="text-sm font-bold truncate max-w-[120px] sm:max-w-[140px]">{activeLeague.name}</span>
                  {activeRole && (
                    <span className={`text-[11px] font-medium uppercase tracking-wide ${roleTextColors[activeRole] || 'text-gray-500'}`}>
                      {activeRole}
                    </span>
                  )}
                </div>
              </Link>
            </Button>
          )}

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Admin Panel Link (only for admins) */}
          {isAdmin && (
            <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
              <Link href="/admin">
                <Shield className="mr-1 size-4" />
                Admin
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
