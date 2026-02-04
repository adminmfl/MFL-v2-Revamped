/**
 * Hook for managing host's custom activity library.
 * Provides CRUD operations for custom activities that can be reused across leagues.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface CustomActivity {
    custom_activity_id: string;
    activity_name: string;
    description: string | null;
    category_id: string | null;
    category?: {
        category_id: string;
        category_name: string;
        display_name: string;
    } | null;
    measurement_type: 'duration' | 'distance' | 'hole' | 'steps' | 'none';
    requires_proof: boolean;
    requires_notes: boolean;
    is_active: boolean;
    created_by: string;
    created_date: string;
    usage_count?: number;
}

export interface CreateCustomActivityInput {
    activity_name: string;
    description?: string;
    category_id?: string;
    measurement_type: 'duration' | 'distance' | 'hole' | 'steps' | 'none';
    requires_proof?: boolean;
    requires_notes?: boolean;
}

export interface UpdateCustomActivityInput {
    custom_activity_id: string;
    activity_name?: string;
    description?: string;
    category_id?: string | null;
    measurement_type?: 'duration' | 'distance' | 'hole' | 'steps' | 'none';
    requires_proof?: boolean;
    requires_notes?: boolean;
}

export interface UseCustomActivitiesReturn {
    activities: CustomActivity[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    createActivity: (input: CreateCustomActivityInput) => Promise<CustomActivity | null>;
    updateActivity: (input: UpdateCustomActivityInput) => Promise<boolean>;
    deleteActivity: (customActivityId: string) => Promise<boolean>;
}

// ============================================================================
// Hook
// ============================================================================

export function useCustomActivities(): UseCustomActivitiesReturn {
    const [activities, setActivities] = useState<CustomActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchActivities = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch('/api/custom-activities');
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch custom activities');
            }

            setActivities(result.data || []);
        } catch (err) {
            console.error('Error fetching custom activities:', err);
            setError(err instanceof Error ? err.message : 'Failed to load custom activities');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createActivity = useCallback(async (input: CreateCustomActivityInput): Promise<CustomActivity | null> => {
        try {
            const response = await fetch('/api/custom-activities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create custom activity');
            }

            // Add to local state
            setActivities((prev) => [...prev, result.data]);
            return result.data;
        } catch (err) {
            console.error('Error creating custom activity:', err);
            setError(err instanceof Error ? err.message : 'Failed to create custom activity');
            return null;
        }
    }, []);

    const updateActivity = useCallback(async (input: UpdateCustomActivityInput): Promise<boolean> => {
        try {
            const response = await fetch('/api/custom-activities', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(input),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to update custom activity');
            }

            // Update local state
            setActivities((prev) =>
                prev.map((a) =>
                    a.custom_activity_id === input.custom_activity_id ? { ...a, ...result.data } : a
                )
            );
            return true;
        } catch (err) {
            console.error('Error updating custom activity:', err);
            setError(err instanceof Error ? err.message : 'Failed to update custom activity');
            return false;
        }
    }, []);

    const deleteActivity = useCallback(async (customActivityId: string): Promise<boolean> => {
        try {
            const response = await fetch('/api/custom-activities', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ custom_activity_id: customActivityId }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to delete custom activity');
            }

            // Remove from local state
            setActivities((prev) => prev.filter((a) => a.custom_activity_id !== customActivityId));
            return true;
        } catch (err) {
            console.error('Error deleting custom activity:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete custom activity');
            return false;
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    return {
        activities,
        isLoading,
        error,
        refetch: fetchActivities,
        createActivity,
        updateActivity,
        deleteActivity,
    };
}

export default useCustomActivities;
