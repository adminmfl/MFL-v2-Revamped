'use client';

/**
 * Rest Day Donations Page
 * 
 * Allows members to request rest day donations.
 * Governor/Host can approve/reject requests.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    IconGift,
    IconCheck,
    IconX,
    IconLoader2,
    IconArrowLeft,
    IconClock,
} from '@tabler/icons-react';
import Link from 'next/link';

interface Donation {
    id: string;
    days_transferred: number;
    status: 'pending' | 'approved' | 'rejected';
    notes: string | null;
    created_at: string;
    donor: {
        member_id: string;
        user_id: string;
        username: string;
    };
    receiver: {
        member_id: string;
        user_id: string;
        username: string;
    };
    approved_by: {
        user_id: string;
        username: string;
    } | null;
}

interface LeagueMember {
    league_member_id: string;
    user_id: string;
    username: string;
}

export default function RestDayDonationsPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const leagueId = params.id as string;

    const [donations, setDonations] = useState<Donation[]>([]);
    const [members, setMembers] = useState<LeagueMember[]>([]);
    const [userRole, setUserRole] = useState<string>('');
    const [userMemberId, setUserMemberId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form state
    const [receiverMemberId, setReceiverMemberId] = useState('');
    const [daysToTransfer, setDaysToTransfer] = useState('1');
    const [notes, setNotes] = useState('');

    // Fetch donations and members
    const fetchData = useCallback(async () => {
        try {
            // Fetch donations (also returns members list)
            const donationsRes = await fetch(`/api/leagues/${leagueId}/rest-day-donations`);
            if (donationsRes.ok) {
                const donationsData = await donationsRes.json();
                setDonations(donationsData.data || []);
                setUserRole(donationsData.userRole || '');
                setUserMemberId(donationsData.userMemberId || '');
                setMembers(donationsData.members || []);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load data');
        } finally {
            setIsLoading(false);
        }
    }, [leagueId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Submit donation request
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!receiverMemberId || !daysToTransfer) {
            toast.error('Please select a receiver and enter days to transfer');
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch(`/api/leagues/${leagueId}/rest-day-donations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    receiver_member_id: receiverMemberId,
                    days_transferred: parseInt(daysToTransfer),
                    notes: notes || undefined,
                }),
            });

            if (res.ok) {
                toast.success('Donation request submitted!');
                setReceiverMemberId('');
                setDaysToTransfer('1');
                setNotes('');
                fetchData();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to submit request');
            }
        } catch (error) {
            console.error('Error submitting donation:', error);
            toast.error('Failed to submit request');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Approve/Reject donation
    const handleUpdateStatus = async (donationId: string, status: 'approved' | 'rejected') => {
        try {
            const res = await fetch(`/api/leagues/${leagueId}/rest-day-donations/${donationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (res.ok) {
                toast.success(`Donation ${status}!`);
                fetchData();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to update donation');
            }
        } catch (error) {
            console.error('Error updating donation:', error);
            toast.error('Failed to update donation');
        }
    };

    const isGovernorOrHost = ['governor', 'host'].includes(userRole);
    const pendingDonations = donations.filter(d => d.status === 'pending');
    const myDonations = donations.filter(
        d => d.donor.member_id === userMemberId || d.receiver.member_id === userMemberId
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <IconLoader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container max-w-4xl mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href={`/leagues/${leagueId}`}>
                    <Button variant="ghost" size="icon">
                        <IconArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <IconGift className="h-6 w-6" />
                        Rest Day Donations
                    </h1>
                    <p className="text-muted-foreground">
                        Transfer rest days to help your teammates
                    </p>
                </div>
            </div>

            <Tabs defaultValue={isGovernorOrHost ? 'approval' : 'request'} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="request">Request Donation</TabsTrigger>
                    <TabsTrigger value="my-donations">My Donations</TabsTrigger>
                    {isGovernorOrHost && (
                        <TabsTrigger value="approval" className="relative">
                            Approval Queue
                            {pendingDonations.length > 0 && (
                                <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs flex items-center justify-center">
                                    {pendingDonations.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Request Donation Tab */}
                <TabsContent value="request">
                    <Card>
                        <CardHeader>
                            <CardTitle>Request approval for rest day donation</CardTitle>
                            <CardDescription>
                                Donate your rest days to another league member. Requires approval.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="receiver">Receiver</Label>
                                        <Select value={receiverMemberId} onValueChange={setReceiverMemberId}>
                                            <SelectTrigger id="receiver">
                                                <SelectValue placeholder="Select a teammate" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {members
                                                    .filter(m => m.league_member_id !== userMemberId)
                                                    .map(m => (
                                                        <SelectItem key={m.league_member_id} value={m.league_member_id}>
                                                            {m.username}
                                                        </SelectItem>
                                                    ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="days">Days to Transfer</Label>
                                        <Input
                                            id="days"
                                            type="number"
                                            min="1"
                                            value={daysToTransfer}
                                            onChange={(e) => setDaysToTransfer(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="notes">Notes (optional)</Label>
                                    <Textarea
                                        id="notes"
                                        placeholder="Reason for donation..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        rows={2}
                                    />
                                </div>

                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <>
                                            <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <IconGift className="h-4 w-4 mr-2" />
                                            Submit Request
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* My Donations Tab */}
                <TabsContent value="my-donations">
                    <Card>
                        <CardHeader>
                            <CardTitle>My Donation History</CardTitle>
                            <CardDescription>
                                Donations you've sent or received
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {myDonations.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">
                                    No donations yet
                                </p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>With</TableHead>
                                            <TableHead>Days</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {myDonations.map(d => (
                                            <TableRow key={d.id}>
                                                <TableCell>
                                                    {d.donor.member_id === userMemberId ? (
                                                        <Badge variant="outline">Sent</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">Received</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {d.donor.member_id === userMemberId
                                                        ? d.receiver.username
                                                        : d.donor.username}
                                                </TableCell>
                                                <TableCell>{d.days_transferred}</TableCell>
                                                <TableCell>
                                                    <StatusBadge status={d.status} />
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {new Date(d.created_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Approval Queue Tab (Governor/Host only) */}
                {isGovernorOrHost && (
                    <TabsContent value="approval">
                        <Card>
                            <CardHeader>
                                <CardTitle>Pending Approvals</CardTitle>
                                <CardDescription>
                                    Review and approve or reject donation requests
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {pendingDonations.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-8">
                                        No pending requests
                                    </p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Donor</TableHead>
                                                <TableHead>Receiver</TableHead>
                                                <TableHead>Days</TableHead>
                                                <TableHead>Notes</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {pendingDonations.map(d => (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-medium">
                                                        {d.donor.username}
                                                    </TableCell>
                                                    <TableCell>{d.receiver.username}</TableCell>
                                                    <TableCell>{d.days_transferred}</TableCell>
                                                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                                                        {d.notes || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="default"
                                                                onClick={() => handleUpdateStatus(d.id, 'approved')}
                                                            >
                                                                <IconCheck className="h-4 w-4 mr-1" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleUpdateStatus(d.id, 'rejected')}
                                                            >
                                                                <IconX className="h-4 w-4 mr-1" />
                                                                Reject
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    switch (status) {
        case 'approved':
            return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Approved</Badge>;
        case 'rejected':
            return <Badge variant="destructive">Rejected</Badge>;
        default:
            return (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/20">
                    <IconClock className="h-3 w-3 mr-1" />
                    Pending
                </Badge>
            );
    }
}
