'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Trophy,
  Users,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  Crown,
  Shield,
  Dumbbell,
  ChevronRight,
  Calendar,
} from 'lucide-react';

import { useLeague, LeagueWithRoles } from '@/contexts/league-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================================================
// Types
// ============================================================================

interface StatCard {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  description: string;
}

type RejectedLeagueSummary = {
  league_id: string;
  league_name: string;
  rejectedCount: number;
  latestDate: string | null;
};

type RejectedSummaryResponse =
  | {
    success: true;
    data: {
      totalRejected: number;
      leagues: RejectedLeagueSummary[];
      cached: boolean;
      cacheTtlMs: number;
    };
  }
  | { success: false; error: string };

// ============================================================================
// Main Dashboard Page
// ============================================================================

export default function DashboardPage() {
  const { data: session } = useSession();
  const { userLeagues, isLoading, setActiveLeague } = useLeague();

  const userName = session?.user?.name?.split(' ')[0] || 'User';

  const [rejectedSummary, setRejectedSummary] = React.useState<{
    totalRejected: number;
    leagues: RejectedLeagueSummary[];
  } | null>(null);

  // Calculate stats
  const stats: StatCard[] = React.useMemo(() => {
    const hostingCount = userLeagues.filter((l) => l.is_host).length;
    const governorCount = userLeagues.filter((l) => l.roles.includes('governor')).length;
    const captainCount = userLeagues.filter((l) => l.roles.includes('captain')).length;
    const needsAttentionCount = rejectedSummary?.totalRejected ?? 0;

    return [
      {
        title: 'Total Leagues',
        value: userLeagues.length,
        change: 0,
        changeLabel: 'Growing strong',
        description: 'Leagues you are a member of',
      },
      {
        title: 'Hosting',
        value: hostingCount,
        change: 0,
        changeLabel: hostingCount > 0 ? 'League creator' : 'Create your first',
        description: 'Leagues you created',
      },
      {
        title: 'Leadership Roles',
        value: governorCount + captainCount,
        change: 0,
        changeLabel: 'Governor & Captain',
        description: 'Management positions held',
      },
      {
        title: 'Submissions Needing Attention',
        value: needsAttentionCount,
        change: 0,
        changeLabel: needsAttentionCount > 0 ? 'Action required' : 'All clear',
        description: 'Rejected submissions across leagues',
      },
    ];
  }, [userLeagues, rejectedSummary?.totalRejected]);

  // Fetch rejected submissions summary (cached client-side to avoid unnecessary load)
  React.useEffect(() => {
    const userId = (session?.user as any)?.id as string | undefined;
    if (!userId) {
      setRejectedSummary(null);
      return;
    }

    const CACHE_TTL_MS = 5 * 60 * 1000;
    const cacheKey = `mfl:rejected-submissions:${userId}`;

    const readCache = ():
      | { ts: number; value: { totalRejected: number; leagues: RejectedLeagueSummary[] } }
      | null => {
      try {
        const raw = window.localStorage.getItem(cacheKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as any;
        if (!parsed || typeof parsed.ts !== 'number' || !parsed.value) return null;
        return parsed;
      } catch {
        return null;
      }
    };

    const cached = readCache();
    const cacheIsFresh = !!(cached && Date.now() - cached.ts < CACHE_TTL_MS);

    // Seed UI from cache for fast paint, but still revalidate so counts drop
    // right after approvals/resubmits. This avoids stale banners when the
    // user has already fixed their submissions.
    if (cacheIsFresh && cached) {
      setRejectedSummary(cached.value);
    }

    let cancelled = false;
    (async () => {
      try {
        const url = cacheIsFresh
          ? '/api/user/rejected-submissions?force=1'
          : '/api/user/rejected-submissions';
        const res = await fetch(url, { cache: 'no-store' });
        const json = (await res.json()) as RejectedSummaryResponse;
        if (cancelled) return;

        if (!res.ok || !json.success) {
          // Preserve cached data when available to avoid blinking to zero on
          // transient errors; only clear when no cache is present.
          if (!cacheIsFresh) setRejectedSummary(null);
          return;
        }

        const value = {
          totalRejected: Number(json.data.totalRejected || 0),
          leagues: Array.isArray(json.data.leagues) ? json.data.leagues : [],
        };
        setRejectedSummary(value);
        try {
          window.localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), value }));
        } catch {
          // ignore storage quota / access errors
        }
      } catch {
        if (!cancelled && !cacheIsFresh) setRejectedSummary(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {userName}!
          </h1>
          <p className="text-muted-foreground">
            {userLeagues.length > 0
              ? `You're part of ${userLeagues.length} league${userLeagues.length !== 1 ? 's' : ''}. Here's your overview.`
              : 'Get started by joining or creating a league to track your fitness journey.'}
          </p>
        </div>
        <div className="flex gap-2">
        </div>
      </div>

      {rejectedSummary?.totalRejected ? (
        <div className="px-4 lg:px-6">
          <Alert
            variant="destructive"
            className="border-destructive/40 bg-destructive/10"
          >
            <AlertTitle>Rejected submission(s) need attention</AlertTitle>
            <AlertDescription className="w-full">
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  You have {rejectedSummary.totalRejected} rejected submission{rejectedSummary.totalRejected === 1 ? '' : 's'} across {rejectedSummary.leagues.length} league{rejectedSummary.leagues.length === 1 ? '' : 's'}.
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/submissions">Review now</Link>
                </Button>
              </div>
              {rejectedSummary.leagues.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {rejectedSummary.leagues.map((l) => (
                    <Button key={l.league_id} variant="outline" size="sm" asChild>
                      <Link href={`/leagues/${l.league_id}/my-submissions`}>
                        {l.league_name} ({l.rejectedCount})
                      </Link>
                    </Button>
                  ))}
                </div>
              )}
            </AlertDescription>
          </Alert>
        </div>
      ) : null}

      {/* Leagues Section */}
      <div className="px-4 lg:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">My Leagues</h2>
            <p className="text-sm text-muted-foreground">
              All leagues you are a member of
            </p>
          </div>
          {userLeagues.length > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/leagues">
                View All
                <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <LeagueGridSkeleton />
        ) : userLeagues.length === 0 ? (
          <LeaguesEmptyState />
        ) : (
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
            {userLeagues
              .filter((league) => league.status !== 'completed')
              .map((league) => (
                <LeagueCard
                  key={league.league_id}
                  league={league}
                  onSelect={() => setActiveLeague(league)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Stats Section Cards */}
      {isLoading ? (
        <SectionCardsSkeleton />
      ) : (
        <SectionCards stats={stats} />
      )}
    </div>
  );
}

// ============================================================================
// Section Cards Component (Admin Style)
// ============================================================================

function SectionCards({ stats }: { stats: StatCard[] }) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-2 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const isPositive = stat.change >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card key={index} className="@container/card p-2.5 sm:p-4">
            <CardHeader className="p-0 sm:p-4 sm:pb-1.5">
              <CardDescription className="text-[11px] sm:text-xs">{stat.title}</CardDescription>
              <CardTitle className="text-lg sm:text-xl font-semibold tabular-nums @[250px]/card:text-2xl">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 p-0 pt-1.5 sm:p-4 sm:pt-0">
              <div className="line-clamp-1 flex gap-1.5 font-medium text-[11px] sm:text-xs">
                {stat.changeLabel} <TrendIcon className="size-3 sm:size-4" />
              </div>
              <div className="text-muted-foreground text-[10px] sm:text-xs line-clamp-1 w-full">{stat.description}</div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================================
// League Card Component
// ============================================================================

function LeagueCard({
  league,
  onSelect,
}: {
  league: LeagueWithRoles;
  onSelect: () => void;
}) {
  const statusColors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    launched: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
  };

  const roleIcons: Record<string, React.ElementType> = {
    host: Crown,
    governor: Shield,
    captain: Users,
    player: Dumbbell,
  };

  return (
    <Link href={`/leagues/${league.league_id}`} onClick={onSelect}>
      <Card className="h-full p-0 hover:shadow-md transition-shadow cursor-pointer group overflow-hidden">
        {/* Cover Gradient */}
        <div className="relative h-16 lg:h-28 rounded-t-lg bg-gradient-to-br from-primary/80 to-primary">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute top-1.5 right-1.5 lg:top-3 lg:right-3">
            <Badge className={statusColors[league.status]} variant="secondary">
              {league.status}
            </Badge>
          </div>
          <div className="absolute top-1.5 left-1.5 lg:top-3 lg:left-3">
            <Avatar className="size-6 lg:size-10 border-2 border-white/70 shadow-sm">
              {league.logo_url ? (
                <AvatarImage src={league.logo_url} alt={league.name} />
              ) : (
                <AvatarFallback className="bg-white/20 text-white font-semibold uppercase">
                  {league.name?.slice(0, 2) || 'LG'}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <div className="absolute bottom-1.5 left-2.5 right-2.5 lg:bottom-3 lg:left-4 lg:right-4 text-white">
            <h3 className="text-xs lg:text-sm font-semibold truncate group-hover:underline">
              {league.name}
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="p-2 lg:p-4">
          <p className="text-[11px] lg:text-sm text-muted-foreground line-clamp-1 lg:line-clamp-2 mb-1 lg:mb-3 min-h-[18px] lg:min-h-[40px]">
            {league.description || 'No description'}
          </p>

          {/* Roles */}
          <div className="flex flex-wrap gap-1">
            {league.roles.map((role) => {
              const RoleIcon = roleIcons[role];
              return (
                <Badge key={role} variant="outline" className="gap-1 text-[9px] lg:text-xs">
                  <RoleIcon className="size-2.5 lg:size-3" />
                  <span className="capitalize">{role}</span>
                </Badge>
              );
            })}
          </div>

          {/* Team */}
          {league.team_name && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t">
              <Users className="size-3.5" />
              <span>Team: {league.team_name}</span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

// ============================================================================
// Empty State Component (Using shadcn Empty)
// ============================================================================

function LeaguesEmptyState() {
  return (
    <Empty className="border rounded-lg">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Trophy />
        </EmptyMedia>
        <EmptyTitle>No leagues yet</EmptyTitle>
        <EmptyDescription>
          You haven't joined any leagues yet. Join an existing league or create
          your own to start your fitness journey with friends!
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/leagues/join">
              <Search className="mr-2 size-4" />
              Join a League
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/leagues/create">
              <Plus className="mr-2 size-4" />
              Create League
            </Link>
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  );
}

// ============================================================================
// Skeleton Components
// ============================================================================

function SectionCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 px-4 lg:px-6 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-2.5 sm:p-4">
          <CardHeader className="p-0 sm:p-4 sm:pb-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16 mt-1.5" />
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1 p-0 pt-1.5 sm:p-4 sm:pt-0">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-36" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

function LeagueGridSkeleton() {
  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="h-full overflow-hidden">
          <div className="h-16 lg:h-28 bg-muted animate-pulse" />
          <div className="p-2.5 lg:p-4 space-y-2 lg:space-y-3">
            <Skeleton className="h-3 lg:h-4 w-3/4" />
            <Skeleton className="h-2.5 lg:h-3 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-4 lg:h-5 w-14 lg:w-16" />
              <Skeleton className="h-4 lg:h-5 w-14 lg:w-16" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
