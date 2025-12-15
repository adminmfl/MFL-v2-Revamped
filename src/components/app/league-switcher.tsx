'use client';

import * as React from 'react';
import { ChevronsUpDown, Trophy, Plus, Search } from 'lucide-react';
import Link from 'next/link';

import { useLeague, LeagueWithRoles } from '@/contexts/league-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// LeagueSwitcher Component
// ============================================================================

export function LeagueSwitcher() {
  const { activeLeague, userLeagues, setActiveLeague, isLoading } = useLeague();
  const { isMobile } = useSidebar();

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="size-8 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
                <Trophy className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeLeague?.name || 'Select League'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeLeague
                    ? `${activeLeague.roles.length} role${activeLeague.roles.length !== 1 ? 's' : ''}`
                    : 'No league selected'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              My Leagues
            </DropdownMenuLabel>

            {userLeagues.length === 0 ? (
              <DropdownMenuItem disabled className="text-muted-foreground">
                No leagues yet
              </DropdownMenuItem>
            ) : (
              userLeagues.map((league) => (
                <DropdownMenuItem
                  key={league.league_id}
                  onClick={() => setActiveLeague(league)}
                  className="gap-2 p-2 cursor-pointer"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border bg-background">
                    <Trophy className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{league.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatRoles(league.roles)}
                    </div>
                  </div>
                  {activeLeague?.league_id === league.league_id && (
                    <div className="size-2 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              ))
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild className="gap-2 p-2 cursor-pointer">
              <Link href="/leagues/join">
                <Search className="size-4" />
                <span>Join a League</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild className="gap-2 p-2 cursor-pointer">
              <Link href="/leagues/create">
                <Plus className="size-4" />
                <span>Create New League</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatRoles(roles: string[]): string {
  if (roles.length === 0) return 'Member';
  if (roles.length === 1) return capitalize(roles[0]);
  return roles.map(capitalize).join(', ');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default LeagueSwitcher;
