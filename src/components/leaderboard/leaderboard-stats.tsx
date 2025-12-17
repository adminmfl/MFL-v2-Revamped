/**
 * Leaderboard Stats Cards
 * Displays summary statistics for the league leaderboard.
 */
'use client';

import {
  Trophy,
  CheckCircle2,
  Clock3,
  XCircle,
  TrendingUp,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { LeaderboardStats as StatsType } from '@/hooks/use-league-leaderboard';

// ============================================================================
// Types
// ============================================================================

interface LeaderboardStatsProps {
  stats: StatsType;
}

// ============================================================================
// Stats Card Component
// ============================================================================

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  suffix?: string;
}

function StatCard({ label, value, icon: Icon, color, suffix }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
      <div className={cn('flex size-10 items-center justify-center rounded-lg', color)}>
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {suffix && <span className="text-base font-normal text-muted-foreground"> {suffix}</span>}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LeaderboardStats({ stats }: LeaderboardStatsProps) {
  const approvalRate = stats.total_submissions > 0
    ? Math.round((stats.approved / stats.total_submissions) * 100)
    : 0;

  const cards = [
    {
      label: 'Total Submissions',
      value: stats.total_submissions,
      icon: Trophy,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Approved',
      value: stats.approved,
      icon: CheckCircle2,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Pending',
      value: stats.pending,
      icon: Clock3,
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    },
    {
      label: 'Approval Rate',
      value: `${approvalRate}%`,
      icon: TrendingUp,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          icon={card.icon}
          color={card.color}
        />
      ))}
    </div>
  );
}

export default LeaderboardStats;
