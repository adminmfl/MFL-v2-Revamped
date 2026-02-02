"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// ============================================================================
// Types
// ============================================================================

interface StatCard {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  description: string;
}

interface SectionCardsProps {
  stats?: StatCard[];
}

// ============================================================================
// Default Stats for Admin Dashboard
// ============================================================================

const defaultStats: StatCard[] = [
  {
    title: "Total Users",
    value: "1,234",
    change: 12.5,
    changeLabel: "Trending up this month",
    description: "Active users in the last 30 days",
  },
  {
    title: "Active Leagues",
    value: "48",
    change: -5,
    changeLabel: "Down from last month",
    description: "Leagues currently in progress",
  },
  {
    title: "Submissions",
    value: "8,456",
    change: 18.2,
    changeLabel: "Strong activity",
    description: "Total submissions this month",
  },
  {
    title: "Revenue",
    value: "₹12,450",
    change: 8.5,
    changeLabel: "Steady growth",
    description: "Monthly recurring revenue",
  },
];

// ============================================================================
// SectionCards Component
// ============================================================================

/**
 * SectionCards - Grid of stat cards for dashboard overview.
 *
 * Features:
 * - Responsive grid layout (1 -> 2 -> 4 columns)
 * - Trend indicators with icons
 * - Customizable stats via props
 */
export function SectionCards({ stats = defaultStats }: SectionCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-2 gap-3 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 sm:grid-cols-2 sm:gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {stats.map((stat, index) => {
        const isPositive = stat.change >= 0;
        const TrendIcon = isPositive ? TrendingUp : TrendingDown;

        return (
          <Card key={index} className="@container/card">
            <CardHeader>
              <CardDescription>{stat.title}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="text-muted-foreground">{stat.description}</div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

export default SectionCards;
