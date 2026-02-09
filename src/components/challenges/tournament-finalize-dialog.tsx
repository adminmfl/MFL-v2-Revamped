'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FinalizeTournamentView } from '@/components/league/tournament/finalize-view';
import { useTournamentMatches } from '@/hooks/use-tournament-matches';

interface TournamentFinalizeDialogProps {
    challengeId: string | null;
    leagueId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    challengeName: string;
    onPublish: () => Promise<void>;
}

export function TournamentFinalizeDialog({
    challengeId,
    leagueId,
    open,
    onOpenChange,
    challengeName,
    onPublish,
}: TournamentFinalizeDialogProps) {
    if (!challengeId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Finalize Scores: {challengeName}</DialogTitle>
                    <DialogDescription>
                        Assign leaderboard points to teams based on their tournament performance.
                    </DialogDescription>
                </DialogHeader>
                <FinalizeContent
                    challengeId={challengeId}
                    leagueId={leagueId}
                    onPublish={onPublish}
                />
            </DialogContent>
        </Dialog>
    );
}

function FinalizeContent({
    challengeId,
    leagueId,
    onPublish,
}: {
    challengeId: string;
    leagueId: string;
    onPublish: () => Promise<void>;
}) {
    const { matches, loading } = useTournamentMatches(challengeId);

    const handlePublish = async () => {
        await onPublish();
    };

    return loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
    ) : (
        <FinalizeTournamentView
            challengeId={challengeId}
            leagueId={leagueId}
            matches={matches}
            onPublish={handlePublish}
        />
    );
}
