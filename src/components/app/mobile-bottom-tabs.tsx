'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { getMobileTabItems, NavItem } from '@/lib/navigation/sidebar-config';
import { cn } from '@/lib/utils';

// ============================================================================
// MobileBottomTabs Component
// ============================================================================

export function MobileBottomTabs() {
  const pathname = usePathname();
  const { activeLeague } = useLeague();
  const { activeRole } = useRole();

  // Get tab items based on current context
  const tabItems = getMobileTabItems(
    activeRole,
    activeLeague?.league_id || null
  );

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabItems.map((item) => (
          <TabItem
            key={item.url}
            item={item}
            isActive={isActiveTab(pathname, item.url)}
          />
        ))}
      </div>
    </nav>
  );
}

// ============================================================================
// TabItem Component
// ============================================================================

function TabItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.url}
      className={cn(
        'flex flex-col items-center justify-center flex-1 h-full px-1 py-2 transition-colors',
        'hover:text-primary active:scale-95',
        isActive
          ? 'text-primary'
          : 'text-muted-foreground'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center w-10 h-7 rounded-full transition-colors',
          isActive && 'bg-primary/10'
        )}
      >
        <Icon className="size-5" />
      </div>
      <span className={cn(
        'text-[10px] mt-1 font-medium truncate max-w-full',
        isActive && 'font-semibold'
      )}>
        {item.title}
      </span>
    </Link>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function isActiveTab(pathname: string | null, tabUrl: string): boolean {
  if (!pathname) return false;

  // Exact match
  if (pathname === tabUrl) return true;

  // For league-specific tabs
  if (tabUrl.includes('/leagues/')) {
    // Check if this is a "root" league path (e.g. /leagues/123)
    // We want this to be EXACT match only, so it doesn't highlight for sub-pages 
    // like /leagues/123/submit which have their own tabs.
    const isLeagueRoot = /^\/leagues\/[^/]+$/.test(tabUrl);

    if (isLeagueRoot) {
      return pathname === tabUrl;
    }

    // For other tabs (like /leagues/123/team), allow prefix matching
    // so /leagues/123/team/manage still highlights Team tab
    if (pathname.startsWith(tabUrl)) {
      return true;
    }
  }

  // Special case for dashboard - only match exact
  if (tabUrl === '/dashboard') {
    return pathname === '/dashboard';
  }

  return false;
}

export default MobileBottomTabs;
