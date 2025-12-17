'use client';

import * as React from 'react';
import { ChevronsUpDown, Trophy, Plus, Search, Crown, Shield, Target, Dumbbell, Check } from 'lucide-react';
import Link from 'next/link';

import { useLeague, LeagueWithRoles, LeagueRole } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { getRoleDisplay } from '@/lib/navigation/sidebar-config';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// LeagueSwitcher Component
// ============================================================================

export function LeagueSwitcher() {
  const { activeLeague, userLeagues, setActiveLeague, isLoading } = useLeague();
  const { activeRole, availableRoles, setActiveRole } = useRole();
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

  const roleDisplay = activeRole ? getRoleDisplay(activeRole) : null;
  const RoleIcon = roleDisplay?.icon || Trophy;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className={`flex size-8 items-center justify-center rounded-lg ${roleDisplay?.color || 'bg-primary text-primary-foreground'}`}>
                <RoleIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeLeague?.name || 'Select League'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeRole ? `Viewing as ${capitalize(activeRole)}` : 'No league selected'}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            {/* Current Role Section */}
            {activeLeague && availableRoles.length > 1 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Switch Role
                </DropdownMenuLabel>
                {availableRoles.map((role) => {
                  const display = getRoleDisplay(role);
                  const Icon = display.icon;
                  const isActive = role === activeRole;

                  return (
                    <DropdownMenuItem
                      key={role}
                      onClick={() => setActiveRole(role)}
                      className="gap-2 p-2 cursor-pointer"
                    >
                      <div className={`flex size-6 items-center justify-center rounded-sm ${display.color}`}>
                        <Icon className="size-3.5" />
                      </div>
                      <span className="flex-1">{display.label}</span>
                      {isActive && <Check className="size-4 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
              </>
            )}

            {/* Leagues Section */}
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
                    <div className="flex items-center gap-1 mt-0.5">
                      {league.roles.slice(0, 2).map((role) => (
                        <Badge
                          key={role}
                          variant="outline"
                          className="text-[10px] px-1 py-0 h-4"
                        >
                          {capitalize(role)}
                        </Badge>
                      ))}
                      {league.roles.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{league.roles.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  {activeLeague?.league_id === league.league_id && (
                    <Check className="size-4 text-primary" />
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

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default LeagueSwitcher;
