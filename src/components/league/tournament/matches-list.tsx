import { format } from 'date-fns';
import { TournamentMatch } from '@/lib/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Shield } from 'lucide-react';

interface MatchesListProps {
    matches: TournamentMatch[];
    isAdmin: boolean;
    onEditMatch: (match: TournamentMatch) => void;
}

export function TournamentMatchesList({ matches, isAdmin, onEditMatch }: MatchesListProps) {
    // Group matches by round
    const matchesByRound = matches.reduce((acc, match) => {
        const round = match.round_name || `Round ${match.round_number}`;
        if (!acc[round]) acc[round] = [];
        acc[round].push(match);
        return acc;
    }, {} as Record<string, TournamentMatch[]>);

    if (matches.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                No matches scheduled yet.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {Object.entries(matchesByRound).map(([roundName, roundMatches]) => (
                <div key={roundName} className="space-y-4">
                    <h3 className="text-lg font-semibold tracking-tight px-1">{roundName}</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        {roundMatches.map((match) => (
                            <Card key={match.match_id} className="overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex flex-col">
                                        {/* Header: Date & Status */}
                                        <div className="bg-muted/30 px-4 py-2 flex justify-between items-center text-xs text-muted-foreground border-b">
                                            <span>
                                                {match.start_time ? format(new Date(match.start_time), 'MMM d, h:mm a') : 'TBD'}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {match.status === 'live' && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">LIVE</Badge>}
                                                {match.status === 'scheduled' && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Scheduled</Badge>}
                                                {match.status === 'completed' && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">Finished</Badge>}
                                                {match.status === 'cancelled' && <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-destructive text-destructive">Cancelled</Badge>}
                                                {isAdmin && (
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditMatch(match)}>
                                                        <Edit2 className="size-3" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Teams & Scores */}
                                        <div className="p-4 flex items-center justify-between">
                                            {/* Team 1 */}
                                            <div className="flex-1 flex flex-col items-center gap-2 text-center">
                                                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Shield className="size-5 text-primary" />
                                                </div>
                                                <span className="font-semibold text-sm leading-tight text-center line-clamp-2">
                                                    {match.team1?.team_name || 'TBD'}
                                                </span>
                                            </div>

                                            {/* Score */}
                                            <div className="px-4 flex flex-col items-center">
                                                <div className="text-2xl font-bold tracking-widest bg-muted/20 px-3 py-1 rounded-md">
                                                    {match.status === 'scheduled' ? 'vs' : `${match.score1} - ${match.score2}`}
                                                </div>
                                            </div>

                                            {/* Team 2 */}
                                            <div className="flex-1 flex flex-col items-center gap-2 text-center">
                                                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Shield className="size-5 text-primary" />
                                                </div>
                                                <span className="font-semibold text-sm leading-tight text-center line-clamp-2">
                                                    {match.team2?.team_name || 'TBD'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
