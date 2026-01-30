"use client";


import * as React from "react";

import { SectionCards } from "@/components/dashboard/section-cards";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminStats, useRecentActivity } from "@/hooks/admin";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Calendar, User } from "lucide-react";

// ============================================================================
// Default Stats (shown when data is unavailable or on error)
// ============================================================================

const defaultStats = [
  {
    title: "Total Users",
    value: "0",
    change: 0,
    changeLabel: "No data available",
    description: "Active users in the last 30 days",
  },
  {
    title: "Active Leagues",
    value: "0",
    change: 0,
    changeLabel: "No data available",
    description: "Leagues currently in progress",
  },
  {
    title: "Submissions",
    value: "0",
    change: 0,
    changeLabel: "No data available",
    description: "This month's submissions",
  },
  {
    title: "Revenue",
    value: "₹0",
    change: 0,
    changeLabel: "No data available",
    description: "This month's revenue",
  },
];

// ============================================================================
// Loading Skeleton for Stats
// ============================================================================

function StatsSkeleton() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-3 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 sm:grid-cols-2 sm:gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="@container/card">
          <CardHeader>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20 mt-2" />
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-40" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function RecentActivitySkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 px-4 lg:px-6">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48 mt-1" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4, 5].map((j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Safe number formatter
// ============================================================================

function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  return defaultValue;
}

function formatCurrency(value: unknown): string {
  const num = safeNumber(value, 0);
  return `₹${num.toLocaleString()}`;
}

function formatNumber(value: unknown): string {
  const num = safeNumber(value, 0);
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusColor(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case 'active':
      return 'default';
    case 'scheduled':
      return 'secondary';
    case 'ended':
    case 'completed':
      return 'outline';
    default:
      return 'secondary';
  }
}

// ============================================================================
// Admin Dashboard Page
// ============================================================================

/**
 * AdminDashboardPage - Main admin dashboard page.
 *
 * Features:
 * - Overview stat cards (users, leagues, submissions, revenue)
 * - Recent leagues and users
 *
 * Layout:
 * - Container with responsive container queries (@container)
 * - Vertical stack with consistent gap
 */
export default function AdminDashboardPage() {
  const { stats, isLoading, error } = useAdminStats();
  const { recentLeagues, recentUsers, isLoading: activityLoading } = useRecentActivity();

  // Transform stats to the format expected by SectionCards
  // On error or no valid data, use default stats with 0 values
  const sectionStats = React.useMemo(() => {
    // If no stats or error, return defaults
    if (!stats || error) {
      return defaultStats;
    }

    // Safely extract values with fallbacks
    const totalUsers = safeNumber(stats.totalUsers);
    const totalUsersChange = safeNumber(stats.totalUsersChange);
    const activeLeagues = safeNumber(stats.activeLeagues);
    const activeLeaguesChange = safeNumber(stats.activeLeaguesChange);
    const totalSubmissions = safeNumber(stats.totalSubmissions);
    const submissionsChange = safeNumber(stats.submissionsChange);
    const totalRevenue = safeNumber(stats.totalRevenue);
    const revenueChange = safeNumber(stats.revenueChange);

    return [
      {
        title: "Total Users",
        value: formatNumber(totalUsers),
        change: totalUsersChange,
        changeLabel: totalUsersChange >= 0 ? "Trending up this month" : "Down from last month",
        description: "Total active users",
      },
      {
        title: "Active Leagues",
        value: formatNumber(activeLeagues),
        change: activeLeaguesChange,
        changeLabel: activeLeaguesChange >= 0 ? "Growing" : "Slightly down",
        description: "Leagues currently in progress",
      },
      {
        title: "Submissions",
        value: formatNumber(totalSubmissions),
        change: submissionsChange,
        changeLabel: submissionsChange >= 0 ? "Strong activity" : "Stable",
        description: "This month's submissions",
      },
      {
        title: "Revenue",
        value: formatCurrency(totalRevenue),
        change: revenueChange,
        changeLabel: revenueChange >= 0 ? "Steady growth" : "Revenue dip",
        description: "This month's revenue",
      },
    ];
  }, [stats, error]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Section Cards - Overview Stats */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <SectionCards stats={sectionStats} />
      )}

      {/* Recent Activity Section */}
      {activityLoading ? (
        <RecentActivitySkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 px-4 lg:px-6">
          {/* Recent Leagues */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Recent Leagues</CardTitle>
              </div>
              <CardDescription>Latest leagues created on the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentLeagues.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No leagues found</p>
              ) : (
                recentLeagues.map((league) => (
                  <div key={league.league_id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Trophy className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{league.league_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(league.created_date)}</span>
                          {league.actual_participants !== null && (
                            <>
                              <span>•</span>
                              <Users className="h-3 w-3" />
                              <span>{league.actual_participants} members</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(league.status)} className="shrink-0 capitalize">
                      {league.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Users */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Recent Users</CardTitle>
              </div>
              <CardDescription>Latest users registered on the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No users found</p>
              ) : (
                recentUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{user.username}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(user.created_date)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={user.platform_role === 'admin' ? 'default' : 'secondary'} className="shrink-0 capitalize">
                      {user.platform_role}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
