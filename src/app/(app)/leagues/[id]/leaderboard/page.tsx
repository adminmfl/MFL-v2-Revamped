/**
 * League Leaderboard Page - Redesigned
 * Clean, compact layout with tabbed leaderboards and collapsible filters.
 */
'use client';

import React, { use, useState, useMemo } from 'react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
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
// Week Calculation Helper
// ============================================================================

interface WeekPreset {
  label: string;
  startDate: string;
  endDate: string;
  weekNumber: number;
}

function calculateWeekPresets(leagueStartDate: string, leagueEndDate: string): WeekPreset[] {
  const start = parseISO(leagueStartDate);
  const end = parseISO(leagueEndDate);
  const today = new Date();
  const weeks: WeekPreset[] = [];

  let weekStart = start;
  let weekNumber = 1;

  while (weekStart <= end && weekStart <= today) {
    const weekEnd = addDays(weekStart, 6);
    const actualEnd = weekEnd > end ? end : weekEnd;

    weeks.push({
      label: `Week ${weekNumber}`,
      startDate: format(weekStart, 'yyyy-MM-dd'),
      endDate: format(actualEnd, 'yyyy-MM-dd'),
      weekNumber,
    });

    weekStart = addDays(weekStart, 7);
    weekNumber++;
  }

  return weeks;
}

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
  const [selectedWeek, setSelectedWeek] = useState<number | 'all' | 'custom'>('all');

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

  // Calculate week presets based on league dates
  const league = data?.league;
  const weekPresets = useMemo(() => {
    if (!league?.start_date || !league?.end_date) return [];
    return calculateWeekPresets(league.start_date, league.end_date);
  }, [league?.start_date, league?.end_date]);

  const handleWeekSelect = (week: number | 'all' | 'custom') => {
    setSelectedWeek(week);
    if (week === 'all') {
      setStartDate(undefined);
      setEndDate(undefined);
      setDateRange(null, null);
      setFilterOpen(false);
    } else if (week === 'custom') {
      setFilterOpen(true);
    } else {
      const preset = weekPresets.find(w => w.weekNumber === week);
      if (preset) {
        setStartDate(parseISO(preset.startDate));
        setEndDate(parseISO(preset.endDate));
        setDateRange(preset.startDate, preset.endDate);
        setFilterOpen(false);
      }
    }
  };

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
    setSelectedWeek('all');
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
  const pendingWindow = (viewRawTotals && canToggleRaw && rawPendingWindow) ? rawPendingWindow : data?.pendingWindow;

  const displayDateRange = dateRange
    ? `${format(parseISO(dateRange.startDate), 'MMM d')} – ${format(parseISO(dateRange.endDate), 'MMM d')}`
    : league?.start_date
      ? `${format(parseISO(league.start_date), 'MMM d')} – ${format(parseISO(league.end_date), 'MMM d')}`
      : 'All time';

  return (
    <div className="@container/main flex flex-1 flex-col gap-3 lg:gap-4">
      {/* Compact Header */}
      <div className="px-4 lg:px-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">
              {league?.league_name || 'Rankings'}
              {normalizationActive && (
                <Badge variant="secondary" className="ml-2 text-xs">Normalized</Badge>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {league?.start_date && league?.end_date && league?.status !== 'completed' && (
            <DynamicReportDialog
              leagueId={leagueId}
              leagueStartDate={league.start_date}
              leagueEndDate={league.end_date}
            />
          )}
          {normalizationActive && canToggleRaw && (
            <Button variant="ghost" size="sm" onClick={() => setViewRawTotals(v => !v)}>
              {viewRawTotals ? 'Normalized' : 'Raw'}
            </Button>
          )}
        </div>
      </div>

      {/* Week Filter Only */}
      <div className="px-4 lg:px-6">
        {/* Date Range Filter Dropdown */}
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="text-sm">
              <Calendar className="size-4 mr-2" />
              {selectedWeek === 'all'
                ? 'All Time'
                : selectedWeek === 'custom'
                  ? (startDate && endDate
                    ? `${format(startDate, 'MMM d')} – ${format(endDate, 'MMM d')}`
                    : 'Custom Range')
                  : weekPresets.find(w => w.weekNumber === selectedWeek)?.label || 'All Time'}
              <ChevronDown className="size-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="flex flex-col gap-1">
              {/* All Time Option */}
              <Button
                variant={selectedWeek === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start"
                onClick={() => handleWeekSelect('all')}
              >
                All Time
              </Button>

              {/* Week Presets */}
              {weekPresets.length > 0 && (
                <>
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1 mt-1">
                    Weeks
                  </div>
                  {weekPresets.map((week) => (
                    <Button
                      key={week.weekNumber}
                      variant={selectedWeek === week.weekNumber ? 'secondary' : 'ghost'}
                      size="sm"
                      className="justify-start"
                      onClick={() => handleWeekSelect(week.weekNumber)}
                    >
                      {week.label}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {format(parseISO(week.startDate), 'MMM d')} – {format(parseISO(week.endDate), 'MMM d')}
                      </span>
                    </Button>
                  ))}
                </>
              )}

              {/* Custom Date Range */}
              <div className="text-xs font-medium text-muted-foreground px-2 py-1 mt-1">
                Custom Range
              </div>
              <div className="flex flex-col gap-2 p-2 rounded border bg-muted/30">
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn('flex-1 text-xs', !startDate && 'text-muted-foreground')}>
                        {startDate ? format(startDate, 'MMM d') : 'Start'}
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
                  <span className="text-xs text-muted-foreground">–</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn('flex-1 text-xs', !endDate && 'text-muted-foreground')}>
                        {endDate ? format(endDate, 'MMM d') : 'End'}
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
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={handleResetDateRange}>Reset</Button>
                  <Button size="sm" className="flex-1 text-xs" onClick={handleApplyDateRange}>Apply</Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Tabbed Leaderboards - Teams & Challenges Only */}
      <div className="px-4 lg:px-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="teams" className="gap-2">
              <Trophy className="size-4" />
              <span>Overall</span>
            </TabsTrigger>
            <TabsTrigger value="challenges" className="gap-2">
              <Flag className="size-4" />
              <span>Challenges</span>
            </TabsTrigger>
          </TabsList>

          {/* Teams Leaderboard (Overall) */}
          <TabsContent value="teams" className="mt-0">
            <div className="rounded-lg border p-3 sm:p-4">
              <div className="mb-3">
                <h2 className="text-base sm:text-lg font-semibold">Overall standings</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">This is the overall leaderboard including challange scores</p>
              </div>
              <div className="overflow-hidden">
                <LeagueTeamsTable teams={teams} showAvgRR={true} />
              </div>
            </div>
          </TabsContent>

          {/* Challenges Leaderboard */}
          <TabsContent value="challenges" className="mt-0">
            <ChallengeSpecificLeaderboard leagueId={leagueId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Real-time Scoreboard - Always Visible Below Tabs */}
      {pendingWindow?.dates?.length ? (
        <div className="px-4 lg:px-6">
          <div className="rounded-lg border p-3 sm:p-4">
            <div className="mb-3">
              <h2 className="text-base sm:text-lg font-semibold">Real-time Scoreboard</h2>
              <p className="text-xs sm:text-sm text-muted-foreground">Today's and yesterday's scores (subject to change)</p>
            </div>
            <div className="overflow-hidden">
              <RealTimeScoreboardTable dates={pendingWindow.dates} teams={pendingWindow.teams || []} />
            </div>
          </div>
        </div>
      ) : null}

      {/* Individual Leaderboard - Always Visible Below Real-time */}
      <div className="px-4 lg:px-6">
        <div className="rounded-lg border p-3 sm:p-4">
          <div className="mb-3">
            <h2 className="text-base sm:text-lg font-semibold">Individual Rankings</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Personal standings</p>
          </div>
          <div className="overflow-hidden">
            <LeagueIndividualsTable individuals={individuals} showAvgRR={true} />
          </div>
        </div>
      </div>

      {/* Stats at Bottom */}
      <div className="px-4 lg:px-6 pb-4">
        <LeaderboardStats stats={stats} />
      </div>
    </div>
  );
}
