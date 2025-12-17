"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  AdminRole,
  AdminRoleFilters,
  AdminRoleCreateInput,
  AdminRoleUpdateInput,
} from "@/types/admin";

// System roles that cannot be deleted or modified
const SYSTEM_ROLES = ["host", "governor", "captain", "player"];

interface UseAdminRolesReturn {
  roles: AdminRole[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createRole: (data: AdminRoleCreateInput) => Promise<AdminRole | null>;
  updateRole: (roleId: string, data: AdminRoleUpdateInput) => Promise<AdminRole | null>;
  deleteRole: (roleId: string) => Promise<{ success: boolean; error?: string }>;
  isSystemRole: (roleName: string) => boolean;
}

export function useAdminRoles(filters?: AdminRoleFilters): UseAdminRolesReturn {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.search) params.set("search", filters.search);

      const response = await fetch(`/api/admin/roles?${params.toString()}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch roles");
      }

      setRoles(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters?.search]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = async (data: AdminRoleCreateInput): Promise<AdminRole | null> => {
    try {
      const response = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create role");
      }

      await fetchRoles();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
      return null;
    }
  };

  const updateRole = async (
    roleId: string,
    data: AdminRoleUpdateInput
  ): Promise<AdminRole | null> => {
    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update role");
      }

      await fetchRoles();
      return result.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
      return null;
    }
  };

  const deleteRole = async (roleId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || "Failed to delete role" };
      }

      await fetchRoles();
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete role";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const isSystemRole = (roleName: string): boolean => {
    return SYSTEM_ROLES.includes(roleName.toLowerCase());
  };

  return {
    roles,
    isLoading,
    error,
    refetch: fetchRoles,
    createRole,
    updateRole,
    deleteRole,
    isSystemRole,
  };
}
