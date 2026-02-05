import { useState, useEffect } from 'react';
import { TournamentMatch } from '@/lib/supabase/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLeagueTeams } from '@/hooks/use-league-teams';

interface MatchDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: any) => Promise<void>; // Type properly if possible
    initialData?: TournamentMatch | null;
    leagueId: string;
}

export function MatchDialog({ open, onOpenChange, onSubmit, initialData, leagueId }: MatchDialogProps) {
    const { data: teamsData } = useLeagueTeams(leagueId);
    const [loading, setLoading] = useState(false);

    // Form State
    const [roundName, setRoundName] = useState('');
    const [team1Id, setTeam1Id] = useState('');
    const [team2Id, setTeam2Id] = useState('');
    const [startTime, setStartTime] = useState<string>('');
    const [status, setStatus] = useState('scheduled');
    const [score1, setScore1] = useState<string>('0');
    const [score2, setScore2] = useState<string>('0');

    useEffect(() => {
        if (open) {
            if (initialData) {
                setRoundName(initialData.round_name || '');
                setTeam1Id(initialData.team1_id || '');
                setTeam2Id(initialData.team2_id || '');
                setStartTime(initialData.start_time || '');
                setStatus(initialData.status);
                setScore1(String(initialData.score1 ?? 0));
                setScore2(String(initialData.score2 ?? 0));
            } else {
                // Reset for new match
                setRoundName('Group Stage');
                setTeam1Id('');
                setTeam2Id('');
                setStartTime(new Date().toISOString());
                setStatus('scheduled');
                setScore1('0');
                setScore2('0');
            }
        }
    }, [open, initialData]);

    const handleSubmit = async () => {
        setLoading(true);
        try {
            let isoStartTime = null;
            if (startTime) {
                try {
                    isoStartTime = new Date(startTime).toISOString();
                } catch (dateErr) {
                    console.error('Invalid Date:', startTime, dateErr);
                    // Fallback or ignore? currently ignore
                }
            }

            console.log('Submitting match:', {
                round_name: roundName,
                team1_id: team1Id,
                team2_id: team2Id,
                start_time: isoStartTime
            });

            await onSubmit({
                round_name: roundName,
                team1_id: team1Id || null,
                team2_id: team2Id || null,
                start_time: isoStartTime,
                status,
                score1: Number(score1),
                score2: Number(score2),
                winner_id: status === 'completed' ? (Number(score1) > Number(score2) ? team1Id : Number(score2) > Number(score1) ? team2Id : null) : null
            });
            onOpenChange(false);
        } catch (e: any) {
            console.error('Match submission error:', e);
            // Try to log more details if available
            if (typeof e === 'object') {
                console.error('Error details:', JSON.stringify(e, null, 2));
                if (e.message) console.error('Error message:', e.message);
                if (e.details) console.error('Error details:', e.details);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Match' : 'Add Match'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Round Name</Label>
                            <Input value={roundName} onChange={(e) => setRoundName(e.target.value)} placeholder="e.g. Finals" />
                        </div>
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                                type="date"
                                value={startTime ? new Date(startTime).toISOString().slice(0, 10) : ''}
                                onChange={(e) => setStartTime(e.target.value ? new Date(e.target.value).toISOString() : '')}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Team 1</Label>
                        <Select value={team1Id} onValueChange={setTeam1Id}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Team 1" />
                            </SelectTrigger>
                            <SelectContent>
                                {teamsData?.teams.map((t) => (
                                    <SelectItem key={t.team_id} value={t.team_id} disabled={t.team_id === team2Id}>
                                        {t.team_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Team 2</Label>
                        <Select value={team2Id} onValueChange={setTeam2Id}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Team 2" />
                            </SelectTrigger>
                            <SelectContent>
                                {teamsData?.teams.map((t) => (
                                    <SelectItem key={t.team_id} value={t.team_id} disabled={t.team_id === team1Id}>
                                        {t.team_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="live">Live</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {(status !== 'scheduled' || initialData) && (
                            <>
                                <div className="space-y-2">
                                    <Label>Score 1</Label>
                                    <Input
                                        type="number"
                                        value={score1}
                                        onChange={(e) => setScore1(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Score 2</Label>
                                    <Input
                                        type="number"
                                        value={score2}
                                        onChange={(e) => setScore2(e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : 'Save Match'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
