/**
 * League Leaderboard Page
 * Displays team and individual rankings with live data from the API.
 */
'use client';

import React, { use, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Trophy,
  Users,
  Medal,
  RefreshCw,
  AlertCircle,
  Calendar,
  Info,
} from 'lucide-react';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { useLeagueLeaderboard } from '@/hooks/use-league-leaderboard';
import {
  LeaderboardStats,
  LeagueTeamsTable,
  LeagueIndividualsTable,
  ChallengeSpecificLeaderboard,
  RealTimeScoreboardTable,
} from '@/components/leaderboard';

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      <div className="px-4 lg:px-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 lg:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="px-4 lg:px-6 grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
      <div className="px-4 lg:px-6">
        <Skeleton className="h-[400px]" />
      </div>
    </div>
  );
}

// ============================================================================
// Top 3 Podium Component
// ============================================================================

interface PodiumProps {
  teams: Array<{
    rank: number;
    team_name: string;
    total_points: number;
  }>;
}

function TopPodium({ teams }: PodiumProps) {
  if (teams.length === 0) return null;

  const first = teams[0];
  const second = teams[1];
  const third = teams[2];

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* 2nd Place */}
      <Card className="text-center pt-6 bg-gradient-to-t from-gray-500/5 to-transparent">
        <CardContent className="p-4">
          {second ? (
            <>
              <div className="size-14 mx-auto rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mb-3">
                <Trophy className="size-7 text-gray-500" />
              </div>
              <Badge className="bg-gray-400 text-white border-0 mb-2">2nd Place</Badge>
              <p className="font-semibold truncate">{second.team_name}</p>
              <p className="text-2xl font-bold text-muted-foreground tabular-nums">
                {second.total_points.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">points</p>
            </>
          ) : (
            <div className="py-4 text-muted-foreground">-</div>
          )}
        </CardContent>
      </Card>

      {/* 1st Place */}
      <Card className="text-center bg-gradient-to-t from-amber-500/10 to-transparent border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          {first ? (
            <>
              <div className="size-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-3 -mt-2 ring-4 ring-amber-200 dark:ring-amber-800">
                <Trophy className="size-9 text-amber-500" />
              </div>
              <Badge className="bg-amber-500 text-white border-0 mb-2">1st Place</Badge>
              <p className="font-bold text-lg truncate">{first.team_name}</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {first.total_points.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">points</p>
            </>
          ) : (
            <div className="py-4 text-muted-foreground">No data yet</div>
          )}
        </CardContent>
      </Card>

      {/* 3rd Place */}
      <Card className="text-center pt-6 bg-gradient-to-t from-amber-700/5 to-transparent">
        <CardContent className="p-4">
          {third ? (
            <>
              <div className="size-14 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
                <Trophy className="size-7 text-amber-700" />
              </div>
              <Badge className="bg-amber-700 text-white border-0 mb-2">3rd Place</Badge>
              <p className="font-semibold truncate">{third.team_name}</p>
              <p className="text-2xl font-bold text-muted-foreground tabular-nums">
                {third.total_points.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">points</p>
            </>
          ) : (
            <div className="py-4 text-muted-foreground">-</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Leaderboard Page
// ============================================================================

export default function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);
  const [view, setView] = useState<'teams' | 'individuals'>('teams');
  const [viewRawTotals, setViewRawTotals] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  // Fetch leaderboard data
  const {
    data,
    rawTeams,
    rawPendingWindow,
    isLoading,
    error,
    refetch,
    setDateRange,
  } = useLeagueLeaderboard(leagueId);
  // Fetch user roles to decide toggle permission
  React.useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await fetch(`/api/leagues/${leagueId}/roles`);
        if (res.ok) {
          const json = await res.json();
          const r = json?.roles;
          const arr = Array.isArray(r) ? r : [r];
          const roleNames = arr.map((x: any) => typeof x === 'string' ? x : (x?.role_name || x));
          setRoles(roleNames.filter(Boolean));
        }
      } catch {}
    };
    if (leagueId) fetchRoles();
  }, [leagueId]);
  const canToggleRaw = roles.includes('host') || roles.includes('governor');

  // Handle date range change
  const handleApplyDateRange = () => {
    setDateRange(
      startDate ? format(startDate, 'yyyy-MM-dd') : null,
      endDate ? format(endDate, 'yyyy-MM-dd') : null
    );
  };

  const handleResetDateRange = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setDateRange(null, null);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6 p-4 lg:p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Error Loading Leaderboard</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="size-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const normalizationActive = Boolean(data?.normalization?.active);
  const normalizationInfo = data?.normalization;
  const teams = (viewRawTotals && canToggleRaw && rawTeams) ? rawTeams : (data?.teams || []);
  const individuals = data?.individuals || [];
  const stats = data?.stats || { total_submissions: 0, approved: 0, pending: 0, rejected: 0, total_rr: 0 };
  const dateRange = data?.dateRange;
  const league = data?.league;
  const pendingWindow = (viewRawTotals && canToggleRaw && rawPendingWindow) ? rawPendingWindow : data?.pendingWindow;

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
          <p className="text-muted-foreground">
            {league?.league_name ? `Rankings for ${league.league_name}` : 'See how teams and individuals are performing'}
          </p>
          {normalizationActive && (
            <div className="mt-1">
              <Badge variant="secondary">Points Normalized</Badge>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="size-4 mr-2" />
            Refresh
          </Button>
          {normalizationActive && canToggleRaw && (
            <Button variant="ghost" size="sm" onClick={() => setViewRawTotals(v => !v)}>
              {viewRawTotals ? 'View Normalized' : 'View Raw Totals'}
            </Button>
          )}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="px-4 lg:px-6">
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Date Range:</span>
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(!startDate && 'text-muted-foreground')}>
                  {startDate ? format(startDate, 'MMM d, yyyy') : 'Start date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  disabled={(date) => endDate ? date > endDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-muted-foreground">to</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn(!endDate && 'text-muted-foreground')}>
                  {endDate ? format(endDate, 'MMM d, yyyy') : 'End date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  disabled={(date) => startDate ? date < startDate : false}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleApplyDateRange}>
              Apply
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetDateRange}>
              Reset to Overall
            </Button>
          </div>

          {dateRange && (
            <Badge variant="secondary" className="ml-auto">
              Showing: {dateRange.startDate} to {dateRange.endDate}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 lg:px-6">
        <LeaderboardStats stats={stats} />
      </div>

      {/* Top 3 Podium */}
      <div className="px-4 lg:px-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Top Performers</h2>
          <p className="text-sm text-muted-foreground">Leading teams in the competition</p>
        </div>
        <TopPodium teams={teams.slice(0, 3)} />
      </div>

      {/* Overall Leaderboard Tables */}
      <div className="px-4 lg:px-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Overall Leaderboard</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Combined scores from workouts and challenges
              {dateRange?.endDate ? (
                <> • As of {format(parseISO(dateRange.endDate), 'MMM d')}</>
              ) : null}
            </span>
            {dateRange?.endDate ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    aria-label="About the delayed leaderboard"
                  >
                    <Info className="size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-w-sm" align="start">
                  <div className="space-y-3">
                    <p>
                      This table shows the official standings as of{' '}
                      {format(parseISO(dateRange.endDate), 'MMM d')}. Final points are submitted and cannot be changed.
                    </p>
                    <p className="text-muted-foreground">
                      For real-time scores from today and yesterday, check the table below.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as 'teams' | 'individuals')}>
          <TabsList>
            <TabsTrigger value="teams" className="gap-2">
              <Users className="size-4" />
              Teams ({teams.length})
            </TabsTrigger>
            <TabsTrigger value="individuals" className="gap-2">
              <Medal className="size-4" />
              Individuals ({individuals.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="teams" className="mt-4">
            <LeagueTeamsTable teams={teams} showAvgRR={true} />
          </TabsContent>
          <TabsContent value="individuals" className="mt-4">
            <LeagueIndividualsTable individuals={individuals} showAvgRR={true} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Real-time (2-day delay window) */}
      {pendingWindow?.dates?.length ? (
        <div className="px-4 lg:px-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Real-time Scoreboard</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Today’s and yesterday’s scores</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground"
                    aria-label="About the real-time scoreboard"
                  >
                    <Info className="size-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-w-sm" align="start">
                  <div className="space-y-3">
                    <p>
                      This table shows real-time scores ranked by today’s points. Avg RR is calculated from both today’s and yesterday’s entries.
                      These standings are subject to change as more entries come in.
                    </p>
                    <p className="text-muted-foreground">
                      For official finalized standings, please refer to the Leaderboard table above.
                    </p>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <RealTimeScoreboardTable dates={pendingWindow.dates} teams={pendingWindow.teams || []} />
        </div>
      ) : null}

      {/* Challenge-Specific Leaderboard */}
      <div className="px-4 lg:px-6">
        <ChallengeSpecificLeaderboard leagueId={leagueId} />
      </div>
    </div>
  );
}
