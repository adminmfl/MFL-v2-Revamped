"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AdminUser,
  AdminUserFilters,
  AdminUserCreateInput,
  AdminUserUpdateInput,
} from "@/types/admin";

interface UseAdminUsersReturn {
  users: AdminUser[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createUser: (data: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    platform_role?: "admin" | "user";
  }) => Promise<AdminUser | null>;
  updateUser: (userId: string, data: AdminUserUpdateInput) => Promise<AdminUser | null>;
  deleteUser: (userId: string) => Promise<boolean>;
}

export function useAdminUsers(filters?: AdminUserFilters): UseAdminUsersReturn {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);
      if (filters?.platform_role && filters.platform_role !== "all") {
        params.set("platform_role", filters.platform_role);
      }
      if (filters?.is_active !== undefined && filters.is_active !== "all") {
        params.set("is_active", String(filters.is_active));
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch users");
      }

      setUsers(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.search, filters?.platform_role, filters?.is_active]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (data: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    platform_role?: "admin" | "user";
  }): Promise<AdminUser | null> => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create user");
      }

      await fetchUsers();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
      return null;
    }
  };

  const updateUser = async (
    userId: string,
    data: AdminUserUpdateInput
  ): Promise<AdminUser | null> => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update user");
      }

      await fetchUsers();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
      return null;
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete user");
      }

      await fetchUsers();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
      return false;
    }
  };

  return {
    users,
    isLoading,
    error,
    refetch: fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}
