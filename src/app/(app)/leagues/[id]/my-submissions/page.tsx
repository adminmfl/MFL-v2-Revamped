/**
 * My Submissions Page
 * Displays a player's workout submissions for the selected league.
 */
'use client';

import { use } from 'react';
import { ClipboardCheck, Plus, AlertCircle } from 'lucide-react';
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
              You are currently viewing as {activeRole}. To view and submit workouts,
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
      <div className="flex flex-col gap-4 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="size-14 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg">
            <ClipboardCheck className="size-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Submissions</h1>
            <p className="text-muted-foreground">
              Track your workout submissions and their approval status
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeLeague?.team_name && (
            <Badge variant="outline" className="text-sm">
              Team: {activeLeague.team_name}
            </Badge>
          )}
          <Button asChild>
            <Link href={`/leagues/${leagueId}/submit`}>
              <Plus className="mr-2 size-4" />
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
