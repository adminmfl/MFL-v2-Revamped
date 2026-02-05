import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useLeagueTeams } from '@/hooks/use-league-teams';
import { Loader2, Trophy, Save } from 'lucide-react';
import { TournamentMatch } from '@/lib/supabase/types';

interface FinalizeViewProps {
    challengeId: string;
    leagueId: string;
    matches: TournamentMatch[];
}

export function FinalizeTournamentView({ challengeId, leagueId, matches }: FinalizeViewProps) {
    const { data: teamsData, isLoading: teamsLoading } = useLeagueTeams(leagueId);
    const [points, setPoints] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Initialize points with some sensible defaults or previous values if we fetch them?
    // For now, we start empty or 0.
    // If we want to show current standings references, we could calculate them here too.

    // We can pre-fill based on "Standings" logic using `matches` if desired, 
    // but the user wanted manual control.
    // Let's just list the teams.

    const handlePointChange = (teamId: string, value: string) => {
        setPoints(prev => ({
            ...prev,
            [teamId]: value
        }));
    };

    const handleFinalize = async () => {
        setSubmitting(true);
        try {
            const scores = Object.entries(points).map(([teamId, scoreStr]) => ({
                teamId,
                points: parseFloat(scoreStr) || 0
            })).filter(s => s.points > 0); // Only send positive scores? User said "0 points as well". 
            // Better to send all defined scores even if 0. 
            // But let's filter only teams that have a defined value to avoid overwriting others with 0 unintentionally?
            // Actually, sending all is safer for a "Finalize" action.

            const payload = Object.entries(points).map(([teamId, scoreStr]) => ({
                teamId,
                points: parseFloat(scoreStr) || 0
            }));

            if (payload.length === 0) {
                toast.error("No points assigned", {
                    description: "Please assign points to at least one team.",
                });
                setSubmitting(false);
                return;
            }

            const res = await fetch(`/api/leagues/${leagueId}/challenges/${challengeId}/finalize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scores: payload })
            });

            const json = await res.json();

            if (!res.ok) throw new Error(json.error || 'Failed to finalize');

            toast.success("Success", {
                description: "Tournament points updated successfully.",
            });

        } catch (err: any) {
            console.error(err);
            toast.error("Error", {
                description: err.message || "Failed to update points",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (teamsLoading) return <div className="text-center p-4">Loading teams...</div>;
    if (!teamsData?.teams) return <div className="text-center p-4">No teams found.</div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-yellow-500" />
                        Assign Leaderboard Points
                    </CardTitle>
                    <CardDescription>
                        Manually assign points to teams based on their tournament performance.
                        These points will be added to the main league leaderboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {teamsData.teams.map(team => (
                                <div key={team.team_id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs">
                                            {team.team_name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <Label htmlFor={`points-${team.team_id}`} className="font-medium cursor-pointer">
                                            {team.team_name}
                                        </Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id={`points-${team.team_id}`}
                                            type="number"
                                            placeholder="0"
                                            className="w-24 text-right"
                                            value={points[team.team_id] || ''}
                                            onChange={(e) => handlePointChange(team.team_id, e.target.value)}
                                        />
                                        <span className="text-sm text-muted-foreground w-6">pts</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleFinalize} disabled={submitting}>
                                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Points
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
