'use client';

/**
 * Download League Report Button
 * 
 * A button component that downloads the user's personalized league report PDF.
 * DIRECT DOWNLOAD - No caching (removed per user request).
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { IconDownload, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';

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

    const handleDownload = useCallback(async () => {
        setIsLoading(true);

        try {
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

            // Download directly
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
