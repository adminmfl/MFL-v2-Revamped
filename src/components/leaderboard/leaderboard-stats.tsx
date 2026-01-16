/**
 * Leaderboard Stats - Compact Horizontal Bar
 * Displays summary statistics in a single line.
 */
'use client';

import {
  Trophy,
  CheckCircle2,
  Clock3,
  TrendingUp,
} from 'lucide-react';

import type { LeaderboardStats as StatsType } from '@/hooks/use-league-leaderboard';

// ============================================================================
// Types
// ============================================================================

interface LeaderboardStatsProps {
  stats: StatsType;
}

// ============================================================================
// Compact Stat Item
// ============================================================================

interface StatItemProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  colorClass: string;
}

function StatItem({ label, value, icon: Icon, colorClass }: StatItemProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`size-4 ${colorClass}`} />
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="font-semibold tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
}

// ============================================================================
// Main Component - Compact Horizontal Bar
// ============================================================================

export function LeaderboardStats({ stats }: LeaderboardStatsProps) {
  const approvalRate = stats.total_submissions > 0
    ? Math.round((stats.approved / stats.total_submissions) * 100)
    : 0;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 p-3 rounded-lg border bg-card/50">
      <StatItem
        label="Submissions"
        value={stats.total_submissions}
        icon={Trophy}
        colorClass="text-primary"
      />
      <div className="hidden sm:block w-px h-4 bg-border" />
      <StatItem
        label="Approved"
        value={stats.approved}
        icon={CheckCircle2}
        colorClass="text-green-500"
      />
      <div className="hidden sm:block w-px h-4 bg-border" />
      <StatItem
        label="Pending"
        value={stats.pending}
        icon={Clock3}
        colorClass="text-yellow-500"
      />
      <div className="hidden sm:block w-px h-4 bg-border" />
      <StatItem
        label="Approval"
        value={`${approvalRate}%`}
        icon={TrendingUp}
        colorClass="text-blue-500"
      />
    </div>
  );
}

export default LeaderboardStats;

