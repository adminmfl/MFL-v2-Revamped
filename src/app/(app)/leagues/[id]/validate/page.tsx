'use client';

import React, { use, useState } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Dumbbell,
  Calendar,
  Filter,
  ChevronDown,
} from 'lucide-react';

import { useRole } from '@/contexts/role-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// ============================================================================
// Types
// ============================================================================

interface Submission {
  id: string;
  user_name: string;
  user_id: string;
  activity_type: string;
  duration: number;
  points: number;
  date: string;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  team_name: string;
}

// ============================================================================
// Validate Submissions Page
// ============================================================================

export default function ValidateSubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isCaptain, isGovernor, isHost } = useRole();

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [dialogAction, setDialogAction] = useState<'approve' | 'reject' | null>(null);

  // Mock submissions data
  const [submissions, setSubmissions] = useState<Submission[]>([
    {
      id: '1',
      user_name: 'John Smith',
      user_id: 'u1',
      activity_type: 'Strength Training',
      duration: 45,
      points: 10,
      date: '2025-12-14',
      notes: 'Upper body workout focusing on chest and shoulders',
      status: 'pending',
      team_name: 'Power Lifters',
    },
    {
      id: '2',
      user_name: 'Sarah Johnson',
      user_id: 'u2',
      activity_type: 'Cardio',
      duration: 30,
      points: 8,
      date: '2025-12-14',
      notes: 'Morning run in the park',
      status: 'pending',
      team_name: 'Power Lifters',
    },
    {
      id: '3',
      user_name: 'Mike Wilson',
      user_id: 'u3',
      activity_type: 'HIIT',
      duration: 25,
      points: 12,
      date: '2025-12-13',
      notes: null,
      status: 'pending',
      team_name: 'Power Lifters',
    },
    {
      id: '4',
      user_name: 'Emily Brown',
      user_id: 'u4',
      activity_type: 'Yoga',
      duration: 60,
      points: 6,
      date: '2025-12-13',
      notes: 'Vinyasa flow session',
      status: 'approved',
      team_name: 'Power Lifters',
    },
    {
      id: '5',
      user_name: 'David Lee',
      user_id: 'u5',
      activity_type: 'Swimming',
      duration: 40,
      points: 10,
      date: '2025-12-12',
      notes: 'Laps at the gym pool',
      status: 'rejected',
      team_name: 'Power Lifters',
    },
  ]);

  // Check permissions
  if (!isCaptain && !isGovernor && !isHost) {
    return (
      <Card className="p-8 text-center">
        <Shield className="size-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">
          Only team captains, governors, and hosts can validate submissions.
        </p>
      </Card>
    );
  }

  const filteredSubmissions = submissions.filter(
    (s) => statusFilter === 'all' || s.status === statusFilter
  );

  const handleApprove = (submission: Submission) => {
    setSelectedSubmission(submission);
    setDialogAction('approve');
  };

  const handleReject = (submission: Submission) => {
    setSelectedSubmission(submission);
    setDialogAction('reject');
    setRejectionReason('');
  };

  const confirmAction = () => {
    if (!selectedSubmission) return;

    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === selectedSubmission.id
          ? { ...s, status: dialogAction === 'approve' ? 'approved' : 'rejected' }
          : s
      )
    );

    setSelectedSubmission(null);
    setDialogAction(null);
    setRejectionReason('');
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="size-6 text-primary" />
            Validate Submissions
          </h1>
          <p className="text-muted-foreground">
            Review and approve team member activities
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="text-sm">
            {pendingCount} pending
          </Badge>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="size-4 text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <Card className="p-8 text-center">
          <Clock className="size-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No submissions to show</h3>
          <p className="text-muted-foreground">
            {statusFilter === 'pending'
              ? 'All submissions have been reviewed.'
              : 'No submissions match the selected filter.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="size-10">
                    <AvatarFallback>
                      {submission.user_name.split(' ').map((n) => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{submission.user_name}</span>
                      <Badge className={statusColors[submission.status]} variant="secondary">
                        {submission.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="size-3.5" />
                        {submission.activity_type}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {submission.duration} min
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {submission.date}
                      </span>
                      <span className="font-medium text-primary">
                        +{submission.points} pts
                      </span>
                    </div>

                    {submission.notes && (
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                        {submission.notes}
                      </p>
                    )}
                  </div>

                  {submission.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(submission)}
                        className="text-destructive hover:text-destructive"
                      >
                        <XCircle className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove(submission)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={dialogAction !== null}
        onOpenChange={() => {
          setDialogAction(null);
          setSelectedSubmission(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction === 'approve' ? 'Approve Submission' : 'Reject Submission'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction === 'approve'
                ? `Are you sure you want to approve ${selectedSubmission?.user_name}'s submission?`
                : `Are you sure you want to reject ${selectedSubmission?.user_name}'s submission?`}
            </DialogDescription>
          </DialogHeader>

          {dialogAction === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason (optional)</label>
              <Textarea
                placeholder="Enter reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              className={
                dialogAction === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-destructive hover:bg-destructive/90'
              }
            >
              {dialogAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
