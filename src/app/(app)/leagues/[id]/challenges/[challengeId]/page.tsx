"use client";

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTournamentMatches } from '@/hooks/use-tournament-matches';
import { useRole } from '@/contexts/role-context';
import { TournamentMatchesList } from '@/components/league/tournament/matches-list';
import { TournamentStandingsTable } from '@/components/league/tournament/standings-table';
import { MatchDialog } from '@/components/league/tournament/match-dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronLeft, Plus, Settings } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';

export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string; challengeId: string }> }) {
    const { id: leagueId, challengeId } = use(params);
    const router = useRouter();
    const { isHost, isGovernor } = useRole();
    const isAdmin = isHost || isGovernor;

    const { matches, loading, refresh, createMatch, updateMatch } = useTournamentMatches(challengeId);

    const [activeTab, setActiveTab] = useState('fixtures');
    const [matchDialogOpen, setMatchDialogOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState<any>(null);

    const handleEditMatch = (match: any) => {
        setEditingMatch(match);
        setMatchDialogOpen(true);
    };

    const handleCreateMatch = () => {
        setEditingMatch(null);
        setMatchDialogOpen(true);
    };

    const handleMatchSubmit = async (data: any) => {
        if (editingMatch) {
            await updateMatch(editingMatch.match_id, data);
        } else {
            await createMatch(data);
        }
        refresh();
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="size-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight">Tournament Challenge</h1>
                    <p className="text-sm text-muted-foreground">Manage fixtures and view standings.</p>
                </div>
                {isAdmin && (
                    <Button onClick={handleCreateMatch} className="gap-2">
                        <Plus className="size-4" />
                        Add Match
                    </Button>
                )}
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="fixtures">Fixtures & Results</TabsTrigger>
                    <TabsTrigger value="standings">Standings</TabsTrigger>
                </TabsList>

                <TabsContent value="fixtures" className="space-y-4">
                    <TournamentMatchesList
                        matches={matches}
                        isAdmin={isAdmin}
                        onEditMatch={handleEditMatch}
                    />
                </TabsContent>

                <TabsContent value="standings">
                    <TournamentStandingsTable matches={matches} leagueId={leagueId} />
                </TabsContent>
            </Tabs>

            {/* Admin Dialogs */}
            <MatchDialog
                open={matchDialogOpen}
                onOpenChange={setMatchDialogOpen}
                onSubmit={handleMatchSubmit}
                initialData={editingMatch}
                leagueId={leagueId}
            />
        </div>
    );
}
