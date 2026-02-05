import { useState } from 'react';
import { useTournamentMatches } from '@/hooks/use-tournament-matches';
import { TournamentMatchesList } from '@/components/league/tournament/matches-list';
import { MatchDialog } from '@/components/league/tournament/match-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { TournamentStandingsTable } from '@/components/league/tournament/standings-table';
import { FinalizeTournamentView } from '@/components/league/tournament/finalize-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TournamentManagerDialogProps {
    challengeId: string | null;
    leagueId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    challengeName: string;
}

export function TournamentManagerDialog({
    challengeId,
    leagueId,
    open,
    onOpenChange,
    challengeName,
}: TournamentManagerDialogProps) {
    if (!challengeId) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage Tournament: {challengeName}</DialogTitle>
                    <DialogDescription>
                        Schedule matches, update scores, and view standings.
                    </DialogDescription>
                </DialogHeader>
                <ManagerContent challengeId={challengeId} leagueId={leagueId} />
            </DialogContent>
        </Dialog>
    );
}

function ManagerContent({ challengeId, leagueId }: { challengeId: string; leagueId: string }) {
    const { matches, loading, refresh, createMatch, updateMatch } = useTournamentMatches(challengeId);
    const [matchDialogOpen, setMatchDialogOpen] = useState(false);
    const [editingMatch, setEditingMatch] = useState<any>(null);
    const [activeTab, setActiveTab] = useState('fixtures');

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
        // refresh() is handled by the hook
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Tabs value={activeTab} onValueChange={(val) => {
                    setActiveTab(val);
                    if (val === 'standings') refresh();
                }} className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <TabsList>
                            <TabsTrigger value="fixtures">Fixtures</TabsTrigger>
                            <TabsTrigger value="standings">Standings</TabsTrigger>
                            <TabsTrigger value="finalize">Finalize & Points</TabsTrigger>
                        </TabsList>

                        {activeTab === 'fixtures' && (
                            <Button onClick={handleCreateMatch} size="sm" className="gap-2">
                                <Plus className="size-4" />
                                Add Match
                            </Button>
                        )}
                    </div>

                    <TabsContent value="fixtures" className="space-y-4">
                        {loading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading matches...</div>
                        ) : (
                            <TournamentMatchesList
                                matches={matches}
                                isAdmin={true}
                                onEditMatch={handleEditMatch}
                            />
                        )}
                    </TabsContent>

                    <TabsContent value="standings">
                        <TournamentStandingsTable matches={matches} leagueId={leagueId} loading={loading} />
                    </TabsContent>

                    <TabsContent value="finalize" className="space-y-4">
                        <FinalizeTournamentView
                            challengeId={challengeId}
                            leagueId={leagueId}
                            matches={matches}
                        />
                    </TabsContent>
                </Tabs>
            </div>

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
