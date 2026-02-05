import { useMemo } from 'react';
import { TournamentMatch } from '@/lib/supabase/types';
import { useLeagueTeams } from '@/hooks/use-league-teams';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Info } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

interface StandingsProps {
    matches: TournamentMatch[];
    leagueId: string;
    loading?: boolean;
}

interface TeamStats {
    teamId: string;
    teamName: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
}

export function TournamentStandingsTable({ matches, leagueId, loading: matchesLoading }: StandingsProps) {
    const { data: teamsData, isLoading: teamsLoading } = useLeagueTeams(leagueId);

    const loading = matchesLoading || teamsLoading;

    const standings = useMemo(() => {
        if (!teamsData) return [];

        // Initialize stats for all teams
        const stats: Record<string, TeamStats> = {};

        // Add all teams from the league (even if they haven't played yet)
        // Note: Ideally we should only add teams participating in this challenge.
        // For now, we assume all teams in the league are in the tournament OR we only show teams that have matches.
        // Let's filter to only teams that appear in matches matches OR initialize from league teams if available.

        teamsData.teams.forEach(team => {
            stats[team.team_id] = {
                teamId: team.team_id,
                teamName: team.team_name,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                points: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                goalDifference: 0
            };
        });

        // Process completed matches
        matches.forEach(match => {
            if (match.status !== 'completed') return;
            if (!match.team1_id || !match.team2_id) return;

            const team1 = stats[match.team1_id];
            const team2 = stats[match.team2_id];

            if (!team1 || !team2) return; // Should not happen if teamsData is up to date

            // Played
            team1.played += 1;
            team2.played += 1;

            // Goals
            team1.goalsFor += match.score1;
            team1.goalsAgainst += match.score2;
            team1.goalDifference += (match.score1 - match.score2);

            team2.goalsFor += match.score2;
            team2.goalsAgainst += match.score1;
            team2.goalDifference += (match.score2 - match.score1);

            // Result
            if (match.score1 > match.score2) {
                team1.won += 1;
                team1.points += 3;
                team2.lost += 1;
            } else if (match.score2 > match.score1) {
                team2.won += 1;
                team2.points += 3;
                team1.lost += 1;
            } else {
                team1.drawn += 1;
                team1.points += 1;
                team2.drawn += 1;
                team2.points += 1;
            }
        });

        return Object.values(stats)
            .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor); // Standard sorting

    }, [matches, teamsData]);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading standings...</div>;
    }

    if (standings.length === 0) {
        return <div className="p-4 text-center text-muted-foreground">No standings available.</div>
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    League Table
                    <Popover>
                        <PopoverTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4 text-sm space-y-2">
                            <h4 className="font-medium mb-1">Legend</h4>
                            <div className="grid grid-cols-[30px_1fr] gap-1">
                                <span className="font-bold">P</span> <span className="text-muted-foreground">Played</span>
                                <span className="font-bold">W</span> <span className="text-muted-foreground">Won</span>
                                <span className="font-bold">D</span> <span className="text-muted-foreground">Drawn</span>
                                <span className="font-bold">L</span> <span className="text-muted-foreground">Lost</span>
                                <span className="font-bold">GD</span> <span className="text-muted-foreground">Goal Difference</span>
                                <span className="font-bold">Pts</span> <span className="text-muted-foreground">Points</span>
                            </div>
                        </PopoverContent>
                    </Popover>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">#</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead className="text-center">P</TableHead>
                            <TableHead className="text-center">W</TableHead>
                            <TableHead className="text-center">D</TableHead>
                            <TableHead className="text-center">L</TableHead>
                            <TableHead className="text-center">GD</TableHead>
                            <TableHead className="text-right font-bold">Pts</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {standings.map((team, index) => (
                            <TableRow key={team.teamId}>
                                <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Shield className="size-3 text-primary" />
                                        </div>
                                        <span className="font-semibold">{team.teamName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">{team.played}</TableCell>
                                <TableCell className="text-center text-green-600">{team.won}</TableCell>
                                <TableCell className="text-center text-muted-foreground">{team.drawn}</TableCell>
                                <TableCell className="text-center text-red-600">{team.lost}</TableCell>
                                <TableCell className="text-center">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</TableCell>
                                <TableCell className="text-right font-bold text-lg">{team.points}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
