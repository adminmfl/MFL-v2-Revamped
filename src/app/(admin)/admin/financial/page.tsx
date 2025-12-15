"use client";

import * as React from "react";

import { FinancialSectionCards } from "@/components/admin/financial-section-cards";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import { useFinancialStats } from "@/hooks/admin";

// ============================================================================
// Default Stats (shown when data is unavailable or on error)
// ============================================================================

const defaultFinancialStats = [
  {
    title: "Total Revenue",
    value: "$0",
    change: 0,
    changeLabel: "No data available",
    description: "Year-to-date revenue",
  },
  {
    title: "Monthly Revenue",
    value: "$0",
    change: 0,
    changeLabel: "No data available",
    description: "Current month earnings",
  },
  {
    title: "Total Payments",
    value: "0",
    change: 0,
    changeLabel: "No data available",
    description: "Completed transactions",
  },
  {
    title: "Avg. Transaction",
    value: "$0.00",
    change: 0,
    changeLabel: "No data available",
    description: "Per transaction value",
  },
];

// ============================================================================
// Loading Skeleton for Financial Stats
// ============================================================================

function FinancialStatsSkeleton() {
  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="@container/card">
          <CardHeader>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-24 mt-2" />
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-44" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

// ============================================================================
// Safe number formatter
// ============================================================================

function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  return defaultValue;
}

function formatCurrency(value: unknown): string {
  const num = safeNumber(value, 0);
  return `$${num.toLocaleString()}`;
}

function formatNumber(value: unknown): string {
  const num = safeNumber(value, 0);
  return num.toLocaleString();
}

function formatDecimal(value: unknown, decimals: number = 2): string {
  const num = safeNumber(value, 0);
  return `$${num.toFixed(decimals)}`;
}

// ============================================================================
// Financial Page
// ============================================================================

export default function FinancialPage() {
  const { stats, isLoading, error } = useFinancialStats();

  // Transform stats to the format expected by FinancialSectionCards
  // On error or no valid data, use default stats with 0 values
  const financialStats = React.useMemo(() => {
    // If no stats or error, return defaults
    if (!stats || error) {
      return defaultFinancialStats;
    }

    // Safely extract values with fallbacks
    const totalRevenue = safeNumber(stats.totalRevenue);
    const totalRevenueChange = safeNumber(stats.totalRevenueChange);
    const monthlyRevenue = safeNumber(stats.monthlyRevenue);
    const monthlyRevenueChange = safeNumber(stats.monthlyRevenueChange);
    const totalTransactions = safeNumber(stats.totalTransactions);
    const transactionsChange = safeNumber(stats.transactionsChange);
    const avgTransaction = safeNumber(stats.avgTransaction);
    const avgTransactionChange = safeNumber(stats.avgTransactionChange);

    return [
      {
        title: "Total Revenue",
        value: formatCurrency(totalRevenue),
        change: totalRevenueChange,
        changeLabel: totalRevenueChange >= 0 ? "Strong growth this quarter" : "Revenue dip",
        description: "Year-to-date revenue",
      },
      {
        title: "Monthly Revenue",
        value: formatCurrency(monthlyRevenue),
        change: monthlyRevenueChange,
        changeLabel: monthlyRevenueChange >= 0 ? "Above target" : "Below target",
        description: "Current month earnings",
      },
      {
        title: "Total Payments",
        value: formatNumber(totalTransactions),
        change: transactionsChange,
        changeLabel: transactionsChange >= 0 ? "Growing steadily" : "Slight decrease",
        description: "Completed transactions",
      },
      {
        title: "Avg. Transaction",
        value: formatDecimal(avgTransaction),
        change: avgTransactionChange,
        changeLabel: avgTransactionChange >= 0 ? "Increasing" : "Slight decrease",
        description: "Per transaction value",
      },
    ];
  }, [stats, error]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-4 lg:gap-6">
      {/* Header */}
      <div className="px-4 lg:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Financial Overview</h1>
        <p className="text-muted-foreground">Revenue analytics and financial metrics</p>
      </div>

      {/* Section Cards */}
      <div className="px-4 lg:px-6">
        {isLoading ? (
          <FinancialStatsSkeleton />
        ) : (
          <FinancialSectionCards stats={financialStats} />
        )}
      </div>

      {/* Revenue Chart */}
      <div className="px-4 lg:px-6">
        <RevenueChart />
      </div>
    </div>
  );
}
