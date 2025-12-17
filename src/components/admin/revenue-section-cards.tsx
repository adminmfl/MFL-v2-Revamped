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

interface RevenueStatCard {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  description: string;
}

interface RevenueSectionCardsProps {
  stats?: RevenueStatCard[];
}

// ============================================================================
// Default Revenue Stats
// ============================================================================

const defaultRevenueStats: RevenueStatCard[] = [
  {
    title: "Total Revenue",
    value: "₹1,24,580",
    change: 15.3,
    changeLabel: "Strong growth this quarter",
    description: "Year-to-date revenue",
  },
  {
    title: "Monthly Revenue",
    value: "₹32,450",
    change: 8.7,
    changeLabel: "Above target",
    description: "Current month earnings",
  },
  {
    title: "Active Subscriptions",
    value: "1,248",
    change: 12.1,
    changeLabel: "Growing steadily",
    description: "Paid subscribers",
  },
  {
    title: "Avg. Transaction",
    value: "₹485.00",
    change: -2.3,
    changeLabel: "Slight decrease",
    description: "Per transaction value",
  },
];

// ============================================================================
// RevenueSectionCards Component
// ============================================================================

export function RevenueSectionCards({ stats = defaultRevenueStats }: RevenueSectionCardsProps) {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
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
              <CardAction>
                <Badge variant="outline" className={isPositive ? "text-green-600" : "text-red-600"}>
                  <TrendIcon className="size-3" />
                  {isPositive ? "+" : ""}
                  {stat.change}%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {stat.changeLabel} <TrendIcon className="size-4" />
              </div>
              <div className="text-muted-foreground">{stat.description}</div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}

export default RevenueSectionCards;
