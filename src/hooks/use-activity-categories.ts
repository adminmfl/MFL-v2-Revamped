/**
 * Hook for fetching activity categories.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ActivityCategory {
    category_id: string;
    category_name: string;
    display_name: string;
    description: string | null;
    display_order: number;
}

export interface UseActivityCategoriesReturn {
    categories: ActivityCategory[];
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useActivityCategories(): UseActivityCategoriesReturn {
    const [categories, setCategories] = useState<ActivityCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch('/api/activity-categories');
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch categories');
            }

            setCategories(result.data || []);
        } catch (err) {
            console.error('Error fetching activity categories:', err);
            setError(err instanceof Error ? err.message : 'Failed to load categories');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return {
        categories,
        isLoading,
        error,
        refetch: fetchCategories,
    };
}

export default useActivityCategories;
