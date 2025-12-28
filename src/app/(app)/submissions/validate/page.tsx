'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';

import { useLeague } from '@/contexts/league-context';
import { Card } from '@/components/ui/card';

export default function SubmissionsValidateRedirectPage() {
  const router = useRouter();
  const { activeLeague, userLeagues, isLoading } = useLeague();

  React.useEffect(() => {
    if (isLoading) return;

    const leagueId = activeLeague?.league_id || userLeagues?.[0]?.league_id;
    if (!leagueId) {
      router.replace('/leagues');
      return;
    }

    // League-scoped validate route will further redirect based on role.
    router.replace(`/leagues/${leagueId}/validate`);
  }, [activeLeague?.league_id, isLoading, router, userLeagues]);

  return (
    <div className="p-6">
      <Card className="p-8 text-center">
        <ClipboardCheck className="size-10 text-muted-foreground mx-auto mb-3" />
        <div className="text-sm text-muted-foreground">Redirecting to validation…</div>
      </Card>
    </div>
  );
}
