"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import { useRevenueChartData } from "@/hooks/admin";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DumbbellLoading } from '@/components/ui/dumbbell-loading';

// ============================================================================
// Chart Config
// ============================================================================

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(142, 76%, 36%)",
  },
  transactions: {
    label: "Transactions",
    color: "hsl(221, 83%, 53%)",
  },
} satisfies ChartConfig;

// ============================================================================
// Loading Skeleton
// ============================================================================

function ChartSkeleton() {
  return <DumbbellLoading label="Loading revenue chart..." />;
}

// ============================================================================
// RevenueChart Component
// ============================================================================

export function RevenueChart() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState("90d");

  // Calculate days based on time range
  const days = React.useMemo(() => {
    if (timeRange === "30d") return 30;
    if (timeRange === "7d") return 7;
    return 90;
  }, [timeRange]);

  // Fetch live chart data
  const { data: chartData, isLoading, error, refetch } = useRevenueChartData(days);

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d");
    }
  }, [isMobile]);

  // Refetch when time range changes
  React.useEffect(() => {
    refetch(days);
  }, [days, refetch]);

  // Filter data based on time range (already filtered by API, but keep for safety)
  const filteredData = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return [];

    const now = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return chartData.filter((item) => {
      const date = new Date(item.date);
      return date >= startDate;
    });
  }, [chartData, timeRange]);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  // Show empty state if no data or error
  const hasData = filteredData.length > 0;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Revenue Overview</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {hasData
              ? "Daily revenue and transaction count"
              : error
              ? "Unable to load chart data"
              : "No revenue data available"}
          </span>
          <span className="@[540px]/card:hidden">
            {hasData ? "Revenue trends" : "No data"}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(value) => value && setTimeRange(value)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {hasData ? (
          <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillTransactions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-transactions)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-transactions)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                    formatter={(value, name) => (
                      <span>
                        {name === "revenue" ? "Revenue" : "Transactions"}:{" "}
                        {name === "revenue"
                          ? `₹${Number(value).toLocaleString('en-IN')}`
                          : Number(value).toLocaleString('en-IN')}
                      </span>
                    )}
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="transactions"
                type="natural"
                fill="url(#fillTransactions)"
                stroke="var(--color-transactions)"
                stackId="a"
              />
              <Area
                dataKey="revenue"
                type="natural"
                fill="url(#fillRevenue)"
                stroke="var(--color-revenue)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[300px] w-full items-center justify-center">
            <p className="text-muted-foreground">
              {error ? "Failed to load chart data" : "No revenue data to display"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RevenueChart;
