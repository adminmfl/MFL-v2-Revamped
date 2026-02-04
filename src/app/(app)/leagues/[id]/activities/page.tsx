'use client';

import React, { use, useMemo } from 'react';
import {
  Dumbbell,
  Plus,
  Check,
  Loader2,
  RefreshCw,
  AlertCircle,
  Shield,
  Info,
  Filter,
  Search,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

import { useRole } from '@/contexts/role-context';
import { useLeague } from '@/contexts/league-context';
import { useLeagueActivities } from '@/hooks/use-league-activities';
import { ActivityMinimumDropdown } from '@/components/leagues/activity-minimum-dropdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================================
// Loading Skeleton
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// League Activities Page
// ============================================================================

export default function LeagueActivitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = use(params);
  const { isHost, isGovernor } = useRole();
  const { activeLeague } = useLeague();

  // Host/Governor can see all activities to configure
  const isAdmin = isHost || isGovernor;
  const { data, isLoading, error, refetch, addActivities, removeActivity, updateFrequency } =
    useLeagueActivities(leagueId, { includeAll: isAdmin });

  const [toggleLoading, setToggleLoading] = React.useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [frequencyDrafts, setFrequencyDrafts] = React.useState<Record<string, string>>({});
  const [frequencyTypeDrafts, setFrequencyTypeDrafts] = React.useState<Record<string, 'weekly' | 'monthly'>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [resetKey, setResetKey] = React.useState(0);

  // Track pending changes before saving
  const [pendingChanges, setPendingChanges] = React.useState<Map<string, { enabled?: boolean; frequency?: number | null; frequency_type?: 'weekly' | 'monthly' | null; minimums?: { min_value: number | null; age_group_overrides: Record<string, any> } }>>(new Map());

  const hasChanges = pendingChanges.size > 0;

  const enabledActivityIds = React.useMemo(() => {
    return new Set(data?.activities.map((a) => a.activity_id) || []);
  }, [data?.activities]);

  const enabledActivityMap = React.useMemo(() => {
    return new Map((data?.activities || []).map((a) => [a.activity_id, a]));
  }, [data?.activities]);

  const supportsFrequency = data?.supportsFrequency !== false;

  React.useEffect(() => {
    if (!data?.activities) return;
    const next: Record<string, string> = {};
    const nextTypes: Record<string, 'weekly' | 'monthly'> = {};
    for (const activity of data.activities) {
      next[activity.activity_id] =
        typeof activity.frequency === 'number' && activity.frequency > 0
          ? String(activity.frequency)
          : '';
      nextTypes[activity.activity_id] = activity.frequency_type === 'monthly' ? 'monthly' : 'weekly';
    }
    setFrequencyDrafts(next);
    setFrequencyTypeDrafts(nextTypes);
  }, [data?.activities]);

  // Extract unique categories
  const categories = useMemo(() => {
    if (!data) return [];
    const allActivities = isAdmin ? data.allActivities || [] : data.activities;
    const categoryMap = new Map();

    allActivities.forEach((activity) => {
      if (activity.category) {
        categoryMap.set(activity.category.category_id, activity.category);
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) =>
      a.display_name.localeCompare(b.display_name)
    );
  }, [data, isAdmin]);

  // Filter activities by selected category
  const filteredActivities = useMemo(() => {
    if (!data) return [];
    const activities = isAdmin ? data.allActivities || [] : data.activities;
    const search = searchTerm.trim().toLowerCase();

    return activities.filter((a) => {
      const matchesCategory = selectedCategory === 'all' || a.category?.category_id === selectedCategory;
      const matchesSearch =
        !search ||
        a.activity_name.toLowerCase().includes(search) ||
        (a.description || '').toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [data, selectedCategory, searchTerm, isAdmin]);

  const sortedActivities = useMemo(() => {
    const list = [...filteredActivities];
    return list.sort((a, b) => {
      const aEnabled = enabledActivityIds.has(a.activity_id) ? 1 : 0;
      const bEnabled = enabledActivityIds.has(b.activity_id) ? 1 : 0;
      if (aEnabled !== bEnabled) return bEnabled - aEnabled; // enabled first
      return a.activity_name.localeCompare(b.activity_name);
    });
  }, [filteredActivities, enabledActivityIds]);

  const handleToggle = (activityId: string, enable: boolean) => {
    // Check if the new state matches the original state
    const originallyEnabled = enabledActivityIds.has(activityId);

    setPendingChanges((prev) => {
      const next = new Map(prev);

      // If toggling back to original state, remove the pending change
      if (enable === originallyEnabled) {
        next.delete(activityId);
      } else {
        // Store change locally instead of saving immediately
        const change = next.get(activityId) || {};
        next.set(activityId, { ...change, enabled: enable });
      }
      return next;
    });
  };

  // Compute checkbox state: use pending change if exists, otherwise use current enabled state
  const getCheckboxState = (activityId: string): boolean => {
    const pendingChange = pendingChanges.get(activityId);
    if (pendingChange?.enabled !== undefined) {
      return pendingChange.enabled;
    }
    return enabledActivityIds.has(activityId);
  };

  const handleFrequencyBlur = (activityId: string) => {
    const raw = (frequencyDrafts[activityId] ?? '').trim();
    const current = enabledActivityMap.get(activityId)?.frequency ?? null;
    const currentType = frequencyTypeDrafts[activityId]
      ?? enabledActivityMap.get(activityId)?.frequency_type
      ?? 'weekly';
    const maxAllowed = currentType === 'monthly' ? 10 : 7;

    if (raw === '') {
      if (current === null) return;
      // Store frequency change
      setPendingChanges((prev) => {
        const next = new Map(prev);
        const change = next.get(activityId) || {};
        next.set(activityId, { ...change, frequency: null });
        return next;
      });
      return;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > maxAllowed) {
      toast.error(`Frequency must be between 1 and ${maxAllowed}`);
      setFrequencyDrafts((prev) => ({
        ...prev,
        [activityId]: typeof current === 'number' ? String(current) : '',
      }));
      return;
    }

    const next = Math.floor(parsed);
    if (current === next) return;

    // Store frequency change
    setPendingChanges((prev) => {
      const nextMap = new Map(prev);
      const change = nextMap.get(activityId) || {};
      nextMap.set(activityId, { ...change, frequency: next });
      return nextMap;
    });
  };

  const handleFrequencyChange = (activityId: string, value: string) => {
    setFrequencyDrafts((prev) => ({
      ...prev,
      [activityId]: value,
    }));

    // Mark as pending immediately when user starts typing
    const trimmed = value.trim();
    const current = enabledActivityMap.get(activityId)?.frequency ?? null;
    const currentType = frequencyTypeDrafts[activityId]
      ?? enabledActivityMap.get(activityId)?.frequency_type
      ?? 'weekly';
    const maxAllowed = currentType === 'monthly' ? 10 : 7;

    if (trimmed === '') {
      if (current !== null) {
        setPendingChanges((prev) => {
          const next = new Map(prev);
          const change = next.get(activityId) || {};
          next.set(activityId, { ...change, frequency: null });
          return next;
        });
      }
    } else {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= maxAllowed) {
        const numVal = Math.floor(parsed);
        if (current !== numVal) {
          setPendingChanges((prev) => {
            const next = new Map(prev);
            const change = next.get(activityId) || {};
            next.set(activityId, { ...change, frequency: numVal });
            return next;
          });
        }
      }
    }
  };

  const handleFrequencyTypeChange = (activityId: string, value: 'weekly' | 'monthly') => {
    setFrequencyTypeDrafts((prev) => ({
      ...prev,
      [activityId]: value,
    }));

    const currentType = enabledActivityMap.get(activityId)?.frequency_type ?? 'weekly';
    const draftFrequencyRaw = (frequencyDrafts[activityId] ?? '').trim();
    const draftFrequency = draftFrequencyRaw === '' ? null : Number(draftFrequencyRaw);
    const maxAllowed = value === 'monthly' ? 10 : 7;

    setPendingChanges((prev) => {
      const next = new Map(prev);
      const change = next.get(activityId) || {};
      if (currentType === value) {
        const { frequency_type: _, ...rest } = change as any;
        if (Object.keys(rest).length === 0) {
          next.delete(activityId);
        } else {
          next.set(activityId, rest);
        }
      } else {
        next.set(activityId, { ...change, frequency_type: value });
      }
      return next;
    });

    if (typeof draftFrequency === 'number' && Number.isFinite(draftFrequency) && draftFrequency > maxAllowed) {
      const clamped = String(maxAllowed);
      setFrequencyDrafts((prev) => ({
        ...prev,
        [activityId]: clamped,
      }));
      setPendingChanges((prev) => {
        const next = new Map(prev);
        const change = next.get(activityId) || {};
        next.set(activityId, { ...change, frequency: maxAllowed });
        return next;
      });
    }
  };

  const handleMinimumChange = (config: { activity_id: string; min_value: number | null; age_group_overrides: Record<string, any> }) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const change = next.get(config.activity_id) || {};
      next.set(config.activity_id, {
        ...change,
        minimums: {
          min_value: config.min_value,
          age_group_overrides: config.age_group_overrides,
        },
      });
      return next;
    });
  };

  const handleSaveChanges = async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const [activityId, change] of pendingChanges) {
        try {
          if (change.enabled !== undefined) {
            const success = change.enabled
              ? await addActivities([activityId])
              : await removeActivity(activityId);
            if (success) successCount++;
            else errorCount++;
          }

          if (change.frequency !== undefined || change.frequency_type !== undefined) {
            const nextFrequency = change.frequency !== undefined
              ? change.frequency
              : enabledActivityMap.get(activityId)?.frequency ?? null;
            const nextFrequencyType = change.frequency_type !== undefined
              ? change.frequency_type
              : frequencyTypeDrafts[activityId]
                ?? enabledActivityMap.get(activityId)?.frequency_type
                ?? 'weekly';

            const success = await updateFrequency(activityId, nextFrequency, nextFrequencyType);
            if (success) successCount++;
            else errorCount++;
          }

          if (change.minimums !== undefined) {
            try {
              const response = await fetch('/api/leagues/activity-minimums', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  league_id: leagueId,
                  activity_id: activityId,
                  symbol: enabledActivityMap.get(activityId)?.activity_name || 'Activity',
                  min_value: change.minimums.min_value,
                  age_group_overrides: change.minimums.age_group_overrides,
                }),
              });
              if (response.ok) successCount++;
              else errorCount++;
            } catch (err) {
              errorCount++;
            }
          }
        } catch (err) {
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast.success(`All ${successCount} changes saved successfully`);
        setPendingChanges(new Map());
      } else if (successCount > 0) {
        toast.error(`Saved ${successCount} changes, but ${errorCount} failed`);
      } else {
        toast.error('Failed to save changes');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setPendingChanges(new Map());
    // Reset frequency drafts to current values
    if (data?.activities) {
      const next: Record<string, string> = {};
      const nextTypes: Record<string, 'weekly' | 'monthly'> = {};
      for (const activity of data.activities) {
        next[activity.activity_id] =
          typeof activity.frequency === 'number' && activity.frequency > 0
            ? String(activity.frequency)
            : '';
        nextTypes[activity.activity_id] = activity.frequency_type === 'monthly' ? 'monthly' : 'weekly';
      }
      setFrequencyDrafts(next);
      setFrequencyTypeDrafts(nextTypes);
    }
    // Force dropdown components to remount with fresh data
    setResetKey(prev => prev + 1);
  };

  // no-op bulk handlers (removed UI); using original per-item toggle UX

  // Regular users just see enabled activities
  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        {/* Header */}
        <div className="flex flex-col gap-4 px-4 lg:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <Dumbbell className="size-6 text-primary" />
                Allowed Activities
              </h1>
              <p className="text-muted-foreground">
                View activities you can submit for this league
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-52">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search activities"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              {categories.length > 0 && (
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 size-4" />
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.category_id} value={cat.category_id}>
                        {cat.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="outline" size="sm" onClick={refetch}>
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 lg:px-6">
          {isLoading && <LoadingSkeleton />}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoading && !error && data && (
            <>
              {filteredActivities.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Dumbbell className="size-8 text-muted-foreground" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">
                      {selectedCategory === 'all'
                        ? 'No Activities Configured'
                        : 'No Activities in This Category'}
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      {selectedCategory === 'all'
                        ? 'The league host hasn\'t configured any activities yet. Contact your league host to enable activities.'
                        : 'No activities found in the selected category.'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredActivities.map((activity) => (
                    <Card key={activity.activity_id} className="border-primary/50 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Check className="size-4 text-primary" />
                          {activity.activity_name}
                        </CardTitle>
                        {activity.category && (
                          <Badge variant="outline" className="w-fit">
                            {activity.category.display_name}
                          </Badge>
                        )}
                        {activity.description && (
                          <CardDescription className="text-sm">
                            {activity.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Admin view (host/governor)
  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Dumbbell className="size-6 text-primary" />
              Configure Activities
            </h1>
            <p className="text-muted-foreground">
              Enable or disable activities for your league
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search activities"
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {categories.length > 0 && (
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 size-4" />
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/leagues/${leagueId}/custom-activities`}>
                  <Sparkles className="size-4 mr-2" />
                  Custom Activities
                </Link>
              </Button>
              <Badge variant="outline">
                {data?.activities.length || 0} Active
              </Badge>
              <Button variant="ghost" size="icon" onClick={refetch} disabled={isSaving} title="Refresh activities">
                <RefreshCw className="size-4" />
              </Button>
            </div>
            {hasChanges && (
              <div className="flex items-center gap-2 sm:ml-auto">
                <Button onClick={handleSaveChanges} disabled={isSaving} size="sm">
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="size-4 mr-2" />
                      Confirm
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={handleDiscardChanges} disabled={isSaving} size="sm">
                  Discard
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Unsaved Changes Alert */}
      {hasChanges && (
        <div className="px-4 lg:px-6">
          <Alert className="border-amber-200 bg-amber-50 dark:border-primary/20 dark:bg-primary/10">
            <AlertCircle className="size-4 text-amber-600 dark:text-primary" />
            <AlertTitle className="text-amber-900 dark:text-primary">Unsaved Changes</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-primary/80">
              You have {pendingChanges.size} pending change{pendingChanges.size !== 1 ? 's' : ''}. Click "Confirm" to save or "Discard" to cancel.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content */}
      <div className="px-4 lg:px-6 space-y-6">
        {isLoading && <LoadingSkeleton />}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && data && (
          <>
            {/* Info Alert */}
            <Alert>
              <Info className="size-4" />
              <AlertTitle>Activity Configuration</AlertTitle>
              <AlertDescription>
                Enable activities that players can submit for this league.
                Players cannot submit workouts until you enable at least one
                activity type.
                {data.activities.length === 0 && (
                  <span className="block mt-2 font-medium text-amber-600">
                    ⚠️ No activities are currently enabled. Players cannot submit
                    workouts.
                  </span>
                )}
                {!supportsFrequency && isHost && (
                  <span className="block mt-2 text-xs text-muted-foreground">
                    Weekly limits are unavailable because the frequency field is not enabled in this environment.
                  </span>
                )}
              </AlertDescription>
            </Alert>

            {/* Host: original toggle grid, with enabled items sorted to the top */}
            {isHost && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {sortedActivities.map((activity) => {
                  const isEnabled = getCheckboxState(activity.activity_id);
                  const isProcessing = toggleLoading === activity.activity_id;
                  const hasPendingChange = pendingChanges.has(activity.activity_id);

                  return (
                    <div
                      key={activity.activity_id}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-lg border transition-all cursor-pointer',
                        hasPendingChange && 'ring-2 ring-amber-400 bg-amber-50/50 dark:ring-primary/60 dark:bg-primary/10',
                        !hasPendingChange && isEnabled && 'border-primary bg-primary/5 ring-1 ring-primary',
                        !hasPendingChange && !isEnabled && 'border-border bg-card hover:border-primary/50',
                        isProcessing && 'opacity-50 pointer-events-none'
                      )}
                      onClick={() =>
                        !isProcessing &&
                        handleToggle(activity.activity_id, !isEnabled)
                      }
                    >
                      <div className="pt-0.5">
                        {isProcessing ? (
                          <Loader2 className="size-5 animate-spin text-muted-foreground" />
                        ) : (
                          <Checkbox
                            checked={isEnabled}
                            disabled={isProcessing}
                            className="pointer-events-none"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-sm leading-tight">
                            {activity.activity_name}
                          </p>
                          {activity.is_custom && (
                            <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30">
                              <Sparkles className="size-3 mr-1" />
                              Custom
                            </Badge>
                          )}
                          {activity.category && (
                            <Badge variant="outline" className="text-xs">
                              {activity.category.display_name}
                            </Badge>
                          )}
                          {hasPendingChange && (
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-primary/10 dark:text-primary dark:border-primary/20">
                              Pending
                            </Badge>
                          )}
                        </div>
                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {activity.description}
                          </p>
                        )}

                        {isEnabled && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <ActivityMinimumDropdown
                              key={`${activity.activity_id}-${resetKey}`}
                              leagueId={leagueId}
                              activityId={activity.activity_id}
                              symbol={activity.activity_name}
                              measurementType={activity.measurement_type}
                              frequency={frequencyDrafts[activity.activity_id] ? parseInt(frequencyDrafts[activity.activity_id]) : null}
                              frequencyType={frequencyTypeDrafts[activity.activity_id] ?? activity.frequency_type ?? 'weekly'}
                              supportsFrequency={supportsFrequency}
                              initialConfig={{
                                min_value: enabledActivityMap.get(activity.activity_id)?.min_value ?? null,
                                max_value: null,
                                age_group_overrides: enabledActivityMap.get(activity.activity_id)?.age_group_overrides ?? {},
                              }}
                              onMinimumChange={handleMinimumChange}
                              onFrequencyChange={handleFrequencyChange}
                              onFrequencyTypeChange={handleFrequencyTypeChange}
                              onFrequencyBlur={handleFrequencyBlur}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Governor: read-only enabled activities */}
            {isGovernor && !isHost && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredActivities
                  .filter((a) => enabledActivityIds.has(a.activity_id))
                  .map((activity) => (
                    <Card key={activity.activity_id} className="border-primary/50 bg-primary/5">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Check className="size-4 text-primary" />
                          {activity.activity_name}
                        </CardTitle>
                        {activity.category && (
                          <Badge variant="outline" className="w-fit">
                            {activity.category.display_name}
                          </Badge>
                        )}
                        {activity.description && (
                          <CardDescription className="text-sm">
                            {activity.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
              </div>
            )}

            {/* Warning if no activities enabled */}
            {isHost && data.activities.length === 0 && data.allActivities && data.allActivities.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                  Players will not be able to submit workouts until you enable
                  at least one activity type. Click on any activity above to
                  enable it.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    </div>
  );
}
