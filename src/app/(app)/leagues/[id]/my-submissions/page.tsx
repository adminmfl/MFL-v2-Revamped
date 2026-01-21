/**
 * My Activities Page
 * Displays a player's activity submissions for the selected league.
 */
'use client';

import { use } from 'react';
import { ClipboardCheck, Plus, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { useMySubmissions } from '@/hooks/use-my-submissions';
import { MySubmissionsTable } from '@/components/submissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// ============================================================================
// My Submissions Page
// ============================================================================

export default function MySubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = use(params);
  const { activeLeague } = useLeague();
  const { activeRole, canSubmitWorkouts } = useRole();
  const { data, isLoading, error, refetch } = useMySubmissions(leagueId);

  // Check if user can submit workouts (must be a player)
  if (!canSubmitWorkouts) {
    return (
      <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
        <div className="px-4 lg:px-6">
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertTitle>Access Restricted</AlertTitle>
            <AlertDescription>
              You are currently viewing as {activeRole}. To view and submit activities,
              you need to be participating as a player in this league.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header */}
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        {/* Top Row: Title + Refresh */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-md">
              <ClipboardCheck className="size-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">My Activities</h1>
              <p className="text-xs text-muted-foreground">
                Track your activity submissions
              </p>
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh" className="size-8">
            <RefreshCw className="size-4 text-muted-foreground" />
            <span className="sr-only">Refresh</span>
          </Button>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          {activeLeague?.team_name && (
            <Badge variant="secondary" className="text-xs font-normal">
              Team: <span className="font-medium ml-1">{activeLeague.team_name}</span>
            </Badge>
          )}
          <Button asChild size="sm" className="shadow-sm">
            <Link href={`/leagues/${leagueId}/submit`}>
              <Plus className="mr-2 size-3.5" />
              New Submission
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 lg:px-6">
        <MySubmissionsTable
          submissions={data?.submissions || []}
          stats={data?.stats || { total: 0, pending: 0, approved: 0, rejected: 0 }}
          isLoading={isLoading}
          error={error}
          onRefresh={refetch}
        />
      </div>
    </div>
  );
}
