
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Shield } from 'lucide-react';

import { useRole } from '@/contexts/role-context';
import { Card } from '@/components/ui/card';

export default function ValidateSubmissionsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { isCaptain, isGovernor, isHost } = useRole();
  const router = useRouter();

  React.useEffect(() => {
    if (isHost || isGovernor) {
      router.replace(`/leagues/${id}/submissions`);
      return;
    }
    if (isCaptain) {
      router.replace(`/leagues/${id}/my-team/submissions`);
    }
  }, [id, isCaptain, isGovernor, isHost, router]);

  if (!isCaptain && !isGovernor && !isHost) {
    return (
      <div className="p-6">
        <Card className="p-8 text-center">
          <Shield className="size-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
          <p className="text-muted-foreground">
            Only team captains, governors, and hosts can validate submissions.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Card className="p-8 text-center">
        <ClipboardCheck className="size-10 text-muted-foreground mx-auto mb-3" />
        <div className="text-sm text-muted-foreground">Redirecting to validation…</div>
      </Card>
    </div>
  );

}
