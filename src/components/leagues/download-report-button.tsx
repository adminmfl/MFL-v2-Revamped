'use client';

/**
 * Download League Report Button
 * 
 * A button component that downloads the user's personalized league report PDF.
 * Features:
 * - IndexedDB caching for instant re-access
 * - Loading state during first-time generation
 * - Automatic download trigger
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { IconDownload, IconLoader2, IconFileText } from '@tabler/icons-react';
import { toast } from 'sonner';

// ============================================================================
// IndexedDB Cache Helpers
// ============================================================================

const DB_NAME = 'LeagueReportCache';
const STORE_NAME = 'reports';
const DB_VERSION = 1;

interface CachedReport {
    leagueId: string;
    userId: string;
    blob: Blob;
    filename: string;
    cachedAt: number;
}

async function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
                store.createIndex('cachedAt', 'cachedAt', { unique: false });
            }
        };
    });
}

async function getCachedReport(leagueId: string, userId: string): Promise<CachedReport | null> {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const cacheKey = `${leagueId}-${userId}`;

        return new Promise((resolve, reject) => {
            const request = store.get(cacheKey);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    // Check if cache is still valid (24 hours)
                    const now = Date.now();
                    const cacheAge = now - result.cachedAt;
                    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

                    if (cacheAge < maxAge) {
                        resolve(result);
                    } else {
                        resolve(null); // Cache expired
                    }
                } else {
                    resolve(null);
                }
            };
        });
    } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
    }
}

async function setCachedReport(
    leagueId: string,
    userId: string,
    blob: Blob,
    filename: string
): Promise<void> {
    try {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const cacheKey = `${leagueId}-${userId}`;

        await new Promise<void>((resolve, reject) => {
            const request = store.put({
                cacheKey,
                leagueId,
                userId,
                blob,
                filename,
                cachedAt: Date.now(),
            });
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
        });
    } catch (error) {
        console.error('Error writing to cache:', error);
    }
}

// ============================================================================
// Download Helper
// ============================================================================

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================================
// Component
// ============================================================================

interface DownloadReportButtonProps {
    leagueId: string;
    userId: string;
    leagueStatus: string;
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg';
    className?: string;
}

export function DownloadReportButton({
    leagueId,
    userId,
    leagueStatus,
    variant = 'default',
    size = 'default',
    className,
}: DownloadReportButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [hasCached, setHasCached] = useState(false);

    // Check if we have a cached version
    useEffect(() => {
        async function checkCache() {
            const cached = await getCachedReport(leagueId, userId);
            setHasCached(!!cached);
        }
        checkCache();
    }, [leagueId, userId]);

    const handleDownload = useCallback(async () => {
        setIsLoading(true);

        try {
            // First, check cache
            const cached = await getCachedReport(leagueId, userId);

            if (cached) {
                // Use cached version
                downloadBlob(cached.blob, cached.filename);
                toast.success('Report downloaded!');
                setIsLoading(false);
                return;
            }

            // Fetch from API
            const response = await fetch(`/api/leagues/${leagueId}/report`);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to generate report');
            }

            // Get filename from Content-Disposition header
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'League_Report.pdf';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) {
                    filename = match[1];
                }
            }

            const blob = await response.blob();

            // Cache the result
            await setCachedReport(leagueId, userId, blob, filename);
            setHasCached(true);

            // Download
            downloadBlob(blob, filename);
            toast.success('Report downloaded!');
        } catch (error) {
            console.error('Error downloading report:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to download report');
        } finally {
            setIsLoading(false);
        }
    }, [leagueId, userId]);

    // Only show button for completed leagues
    const isCompleted = leagueStatus === 'completed' || leagueStatus === 'ended';

    if (!isCompleted) {
        return null;
    }

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleDownload}
            disabled={isLoading}
            className={className}
        >
            {isLoading ? (
                <>
                    <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                </>
            ) : hasCached ? (
                <>
                    <IconFileText className="h-4 w-4 mr-2" />
                    Download Report
                </>
            ) : (
                <>
                    <IconDownload className="h-4 w-4 mr-2" />
                    Download My League Report
                </>
            )}
        </Button>
    );
}

export default DownloadReportButton;
