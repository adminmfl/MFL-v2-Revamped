"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AdminLeague,
  AdminLeagueFilters,
  AdminLeagueCreateInput,
  AdminLeagueUpdateInput,
} from "@/types/admin";

interface UseAdminLeaguesReturn {
  leagues: AdminLeague[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createLeague: (data: AdminLeagueCreateInput) => Promise<AdminLeague | null>;
  updateLeague: (leagueId: string, data: AdminLeagueUpdateInput) => Promise<AdminLeague | null>;
  deleteLeague: (leagueId: string) => Promise<boolean>;
}

export function useAdminLeagues(filters?: AdminLeagueFilters): UseAdminLeaguesReturn {
  const [leagues, setLeagues] = useState<AdminLeague[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeagues = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.status && filters.status !== "all") {
        params.set("status", filters.status);
      }
      if (filters?.is_active !== undefined && filters.is_active !== "all") {
        params.set("is_active", String(filters.is_active));
      }

      const response = await fetch(`/api/admin/leagues?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch leagues");
      }

      setLeagues(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLeagues([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.search, filters?.status, filters?.is_active]);

  useEffect(() => {
    fetchLeagues();
  }, [fetchLeagues]);

  const createLeague = async (data: AdminLeagueCreateInput): Promise<AdminLeague | null> => {
    try {
      const response = await fetch("/api/admin/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create league");
      }

      await fetchLeagues();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create league");
      return null;
    }
  };

  const updateLeague = async (
    leagueId: string,
    data: AdminLeagueUpdateInput
  ): Promise<AdminLeague | null> => {
    try {
      const response = await fetch(`/api/admin/leagues/${leagueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update league");
      }

      await fetchLeagues();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update league");
      return null;
    }
  };

  const deleteLeague = async (leagueId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/leagues/${leagueId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete league");
      }

      await fetchLeagues();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete league");
      return false;
    }
  };

  return {
    leagues,
    isLoading,
    error,
    refetch: fetchLeagues,
    createLeague,
    updateLeague,
    deleteLeague,
  };
}
