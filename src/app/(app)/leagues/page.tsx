'use client';

import React from 'react';
import Link from 'next/link';
import {
  Trophy,
  Plus,
  Search,
  Crown,
  Shield,
  Users,
  Dumbbell,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

import { useLeague, LeagueWithRoles } from '@/contexts/league-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// ============================================================================
// Leagues Page
// ============================================================================

export default function LeaguesPage() {
  const { userLeagues, isLoading, setActiveLeague } = useLeague();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [roleFilter, setRoleFilter] = React.useState<string>('all');

  // Filter leagues
  const filteredLeagues = React.useMemo(() => {
    return userLeagues.filter((league) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = league.name.toLowerCase().includes(query);
        const matchesDescription = league.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && league.status !== statusFilter) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all' && !league.roles.includes(roleFilter as any)) {
        return false;
      }

      return true;
    });
  }, [userLeagues, searchQuery, statusFilter, roleFilter]);

  // Calculate stats
  const stats = React.useMemo(() => {
    const activeCount = userLeagues.filter((l) => l.status === 'active').length;
    const hostCount = userLeagues.filter((l) => l.roles.includes('host')).length;
    return { total: userLeagues.length, active: activeCount, hosting: hostCount };
  }, [userLeagues]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Leagues</h1>
          <p className="text-muted-foreground">
            Manage and view all your fitness leagues
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/leagues/join">
              <Search className="mr-2 size-4" />
              Join
            </Link>
          </Button>
          <Button asChild>
            <Link href="/leagues/create">
              <Plus className="mr-2 size-4" />
              Create
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards - Section Cards Style */}
      {!isLoading && userLeagues.length > 0 && (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-3">
          <Card className="@container/card">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Trophy className="size-4" />
                Total Leagues
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {stats.total}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className="text-green-600">
                  <TrendingUp className="size-3" />
                  Active
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                All your leagues <Trophy className="size-4" />
              </div>
              <div className="text-muted-foreground">Across all roles and statuses</div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Dumbbell className="size-4" />
                Active Leagues
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {stats.active}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className={stats.active > 0 ? 'text-green-600' : 'text-muted-foreground'}>
                  {stats.active > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {stats.active > 0 ? 'In Progress' : 'None'}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Currently competing <Dumbbell className="size-4" />
              </div>
              <div className="text-muted-foreground">Leagues you're participating in</div>
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Crown className="size-4" />
                Hosting
              </CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {stats.hosting}
              </CardTitle>
              <CardAction>
                <Badge variant="outline" className={stats.hosting > 0 ? 'text-amber-600' : 'text-muted-foreground'}>
                  <Crown className="size-3" />
                  Host
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                Leagues you manage <Crown className="size-4" />
              </div>
              <div className="text-muted-foreground">Full admin control</div>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search leagues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="launched">Launched</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="host">Host</SelectItem>
            <SelectItem value="governor">Governor</SelectItem>
            <SelectItem value="captain">Captain</SelectItem>
            <SelectItem value="player">Player</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Count */}
      {!isLoading && userLeagues.length > 0 && (
        <div className="px-4 lg:px-6">
          <p className="text-sm text-muted-foreground">
            {filteredLeagues.length} league(s) total
          </p>
        </div>
      )}

      {/* Leagues Grid */}
      <div className="px-4 lg:px-6">
        {isLoading ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <LeagueCardSkeleton />
            <LeagueCardSkeleton />
            <LeagueCardSkeleton />
            <LeagueCardSkeleton />
            <LeagueCardSkeleton />
            <LeagueCardSkeleton />
          </div>
        ) : filteredLeagues.length === 0 ? (
          <EmptyState
            hasLeagues={userLeagues.length > 0}
            hasFilters={searchQuery !== '' || statusFilter !== 'all' || roleFilter !== 'all'}
            onClearFilters={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setRoleFilter('all');
            }}
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLeagues.map((league) => (
              <LeagueCard
                key={league.league_id}
                league={league}
                onSelect={() => setActiveLeague(league)}
              />
            ))}
          </div>
        )}
      </div>
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
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group overflow-hidden">
        {/* Cover Gradient */}
        <div className="relative h-28 bg-gradient-to-br from-primary/80 to-primary">
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute top-3 right-3">
            <Badge className={statusColors[league.status]} variant="secondary">
              {league.status}
            </Badge>
          </div>
          <div className="absolute top-3 left-3">
            <Avatar className="size-10 border-2 border-white/70 shadow-sm">
              {league.logo_url ? (
                <AvatarImage src={league.logo_url} alt={league.name} />
              ) : (
                <AvatarFallback className="bg-white/20 text-white font-semibold uppercase">
                  {league.name?.slice(0, 2) || 'LG'}
                </AvatarFallback>
              )}
            </Avatar>
          </div>
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <h3 className="font-semibold truncate group-hover:underline">
              {league.name}
            </h3>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[40px]">
            {league.description || 'No description'}
          </p>

          {/* Roles */}
          <div className="flex flex-wrap gap-1.5">
            {league.roles.map((role) => {
              const RoleIcon = roleIcons[role];
              return (
                <Badge key={role} variant="outline" className="gap-1 text-xs">
                  <RoleIcon className="size-3" />
                  <span className="capitalize">{role}</span>
                </Badge>
              );
            })}
          </div>

          {/* Team */}
          {league.team_name && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3 pt-3 border-t">
              <Users className="size-3.5" />
              <span>Team: {league.team_name}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasLeagues: boolean;
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  if (hasFilters) {
    return (
      <Empty className="border rounded-lg">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search />
          </EmptyMedia>
          <EmptyTitle>No matches found</EmptyTitle>
          <EmptyDescription>
            No leagues match your current filters. Try adjusting your search criteria.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

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
// Skeleton Component
// ============================================================================

function LeagueCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden">
      <div className="h-28 bg-muted animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}
