/**
 * League Leaderboard Page - Redesigned
 * Clean, compact layout with tabbed leaderboards and collapsible filters.
 */
'use client';

import React, { use, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  RefreshCw,
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trophy,
  Users,
  User,
  Flag,
  Info,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

import { useLeagueLeaderboard } from '@/hooks/use-league-leaderboard';
import {
  LeaderboardStats,
  LeagueTeamsTable,
  LeagueIndividualsTable,
  ChallengeSpecificLeaderboard,
  RealTimeScoreboardTable,
} from '@/components/leaderboard';
import { DynamicReportDialog } from '@/components/leagues/dynamic-report-dialog';

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-[400px]" />
    </div>
  );
}

// ============================================================================
// Leaderboard Page
// ============================================================================

export default function LeaderboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);
  const [viewRawTotals, setViewRawTotals] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('teams');

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

  // Fetch user roles
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
      } catch { }
    };
    if (leagueId) fetchRoles();
  }, [leagueId]);

  const canToggleRaw = roles.includes('host') || roles.includes('governor');

  const handleApplyDateRange = () => {
    setDateRange(
      startDate ? format(startDate, 'yyyy-MM-dd') : null,
      endDate ? format(endDate, 'yyyy-MM-dd') : null
    );
    setFilterOpen(false);
  };

  const handleResetDateRange = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setDateRange(null, null);
    setFilterOpen(false);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 p-4 lg:p-6">
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
  const teams = (viewRawTotals && canToggleRaw && rawTeams) ? rawTeams : (data?.teams || []);
  const individuals = data?.individuals || [];
  const stats = data?.stats || { total_submissions: 0, approved: 0, pending: 0, rejected: 0, total_rr: 0 };
  const dateRange = data?.dateRange;
  const league = data?.league;
  const pendingWindow = (viewRawTotals && canToggleRaw && rawPendingWindow) ? rawPendingWindow : data?.pendingWindow;

  const displayDateRange = dateRange
    ? `${format(parseISO(dateRange.startDate), 'MMM d')} – ${format(parseISO(dateRange.endDate), 'MMM d')}`
    : league?.start_date
      ? `${format(parseISO(league.start_date), 'MMM d')} – ${format(parseISO(league.end_date), 'MMM d')}`
      : 'All time';

  return (
    <div className="@container/main flex flex-1 flex-col gap-3 lg:gap-4">
      {/* Compact Header */}
      <div className="flex flex-col gap-2 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              {league?.league_name || 'Rankings'}
              {normalizationActive && (
                <Badge variant="secondary" className="ml-2 text-xs">Normalized</Badge>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {league?.start_date && league?.end_date && league?.status !== 'completed' && (
            <DynamicReportDialog
              leagueId={leagueId}
              leagueStartDate={league.start_date}
              leagueEndDate={league.end_date}
            />
          )}
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="size-4" />
          </Button>
          {normalizationActive && canToggleRaw && (
            <Button variant="ghost" size="sm" onClick={() => setViewRawTotals(v => !v)}>
              {viewRawTotals ? 'Normalized' : 'Raw'}
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar + Collapsible Filter */}
      <div className="px-4 lg:px-6 space-y-2">
        <LeaderboardStats stats={stats} />

        {/* Collapsible Date Filter */}
        <Collapsible open={filterOpen} onOpenChange={setFilterOpen}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="text-sm text-muted-foreground">
                <Calendar className="size-4 mr-2" />
                {displayDateRange}
                {filterOpen ? <ChevronUp className="size-4 ml-2" /> : <ChevronDown className="size-4 ml-2" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className="pt-3">
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/30">
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
              <Button size="sm" onClick={handleApplyDateRange}>Apply</Button>
              <Button variant="ghost" size="sm" onClick={handleResetDateRange}>Reset</Button>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Tabbed Leaderboards */}
      <div className="px-4 lg:px-6 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="teams" className="gap-2">
              <Trophy className="size-4" />
              <span>Teams</span>
            </TabsTrigger>
            <TabsTrigger value="individual" className="gap-2">
              <User className="size-4" />
              <span>Individual</span>
            </TabsTrigger>
            <TabsTrigger value="challenges" className="gap-2">
              <Flag className="size-4" />
              <span>Challenges</span>
            </TabsTrigger>
          </TabsList>


          {/* Teams Leaderboard (Main) */}
          <TabsContent value="teams" className="mt-0">
            <div className="rounded-lg border p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Team Rankings</h2>
                  <p className="text-sm text-muted-foreground">Overall standings</p>
                </div>
              </div>
              <LeagueTeamsTable teams={teams} showAvgRR={true} />
            </div>
          </TabsContent>

          {/* Individual Leaderboard */}
          <TabsContent value="individual" className="mt-0">
            <div className="rounded-lg border p-4">
              <div className="mb-3">
                <h2 className="text-lg font-semibold">Individual Rankings</h2>
                <p className="text-sm text-muted-foreground">Personal standings</p>
              </div>
              <LeagueIndividualsTable individuals={individuals} showAvgRR={true} />
            </div>
          </TabsContent>

          {/* Challenge Leaderboard */}
          <TabsContent value="challenges" className="mt-0">
            <ChallengeSpecificLeaderboard leagueId={leagueId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Real-time Scoreboard (Below, always visible if data exists) */}
      {pendingWindow?.dates?.length ? (
        <div className="px-4 lg:px-6">
          <div className="rounded-lg border p-4">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-lg font-semibold">Real-time Scoreboard</h2>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Info className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="max-w-sm" align="start">
                  Today's and yesterday's scores. Subject to change.
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Scores from today and yesterday</p>
            <RealTimeScoreboardTable dates={pendingWindow.dates} teams={pendingWindow.teams || []} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
