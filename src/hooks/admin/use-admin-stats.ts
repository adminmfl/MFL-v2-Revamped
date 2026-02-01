"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardStats, RevenueStats } from "@/types/admin";
import type { RevenueChartDataPoint } from "@/lib/services/admin/admin-stats";

interface UseAdminStatsReturn {
  stats: DashboardStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseRevenueStatsReturn {
  stats: RevenueStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching dashboard statistics
 */
export function useAdminStats(): UseAdminStatsReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/stats");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch stats");
      }

      setStats(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

/**
 * Hook for fetching revenue statistics
 */
export function useRevenueStats(): UseRevenueStatsReturn {
  const [stats, setStats] = useState<RevenueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/revenue");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch revenue stats");
      }

      setStats(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats,
  };
}

// ============================================================================
// Revenue Chart Data Hook
// ============================================================================

interface UseRevenueChartDataReturn {
  data: RevenueChartDataPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: (days?: number) => Promise<void>;
}

/**
 * Hook for fetching revenue chart data
 */
export function useRevenueChartData(initialDays: number = 90): UseRevenueChartDataReturn {
  const [data, setData] = useState<RevenueChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (days: number = initialDays) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/chart?days=${days}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch chart data");
      }

      setData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, [initialDays]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// ============================================================================
// Recent Activity Hook
// ============================================================================

import type { RecentLeague, RecentUser } from '@/lib/services/admin/admin-stats';

interface UseRecentActivityReturn {
  recentLeagues: RecentLeague[];
  recentUsers: RecentUser[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching recent activity (leagues and users)
 */
export function useRecentActivity(): UseRecentActivityReturn {
  const [recentLeagues, setRecentLeagues] = useState<RecentLeague[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/recent');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch recent activity');
      }

      setRecentLeagues(result.data?.recentLeagues || []);
      setRecentUsers(result.data?.recentUsers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setRecentLeagues([]);
      setRecentUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    recentLeagues,
    recentUsers,
    isLoading,
    error,
    refetch: fetchData,
  };
}

