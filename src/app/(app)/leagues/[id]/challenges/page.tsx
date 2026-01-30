'use client';

import * as React from 'react';
import { use } from 'react';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle2, Clock3, XCircle, FileText, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isReuploadWindowOpen } from '@/lib/utils/reupload-window';

// Types
type Challenge = {
  id: string;
  name: string;
  description: string | null;
  challenge_type: 'individual' | 'team' | 'sub_team';
  total_points: number;
  status: 'draft' | 'scheduled' | 'active' | 'submission_closed' | 'published' | 'closed';
  start_date: string | null;
  end_date: string | null;
  doc_url: string | null;
  my_submission: ChallengeSubmission | null;
};

type ChallengeSubmission = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_url: string;
  reviewed_at: string | null;
  created_at: string;
};

// Helpers
const statusBadge = (s: Challenge['status']) => {
  switch (s) {
    case 'draft':
    case 'scheduled':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-blue-200">Coming Soon</Badge>;
    case 'active':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200">Active</Badge>;
    case 'submission_closed':
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100/80 border-orange-200">Submissions Closed</Badge>;
    case 'published':
    case 'closed':
      return <Badge variant="secondary">Completed</Badge>;
    default:
      return <Badge variant="outline">{s}</Badge>;
  }
};

function submissionStatusBadge(status: ChallengeSubmission['status']) {
  const map = {
    pending: { label: 'Pending Review', icon: Clock3, className: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved ✓', icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
    rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-100 text-red-700' },
  } as const;
  const cfg = map[status];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 w-fit', cfg.className)}>
      <Icon className="size-3" />
      {cfg.label}
    </Badge>
  );
}

const getChallengeTypeLabel = (type: Challenge['challenge_type']) => {
  switch (type) {
    case 'team':
      return 'Team Challenge';
    case 'individual':
      return 'Individual Challenge';
    case 'sub_team':
      return 'Sub-Team Challenge';
    default:
      return type;
  }
};

export default function ChallengesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);
  const tzOffsetMinutes = React.useMemo(() => new Date().getTimezoneOffset(), []);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [challenges, setChallenges] = React.useState<Challenge[]>([]);

  // Submit dialog state
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [submitChallenge, setSubmitChallenge] = React.useState<Challenge | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // View Proof dialog
  const [viewProofOpen, setViewProofOpen] = React.useState(false);
  const [viewProofUrl, setViewProofUrl] = React.useState<string | null>(null);

  const canReuploadSubmission = React.useCallback(
    (submission: ChallengeSubmission | null) => {
      if (!submission || submission.status !== 'rejected') return false;
      const rejectionTime = submission.reviewed_at || submission.created_at;
      return isReuploadWindowOpen(rejectionTime, tzOffsetMinutes);
    },
    [tzOffsetMinutes]
  );

  const fetchChallenges = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/challenges`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load challenges');
      }
      // Filter to only show non-draft challenges to players
      const visibleChallenges = (json.data?.active || []).filter(
        (c: Challenge) => c.status !== 'draft'
      );
      setChallenges(visibleChallenges);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  React.useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const handleOpenSubmit = (challenge: Challenge) => {
    setSubmitChallenge(challenge);
    setSelectedFile(null);
    setSubmitOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUploadAndSubmit = async () => {
    if (!submitChallenge) return;
    if (!selectedFile) {
      toast.error('Please choose a proof image');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('league_id', leagueId);
      formData.append('challenge_id', submitChallenge.id);

      const uploadRes = await fetch('/api/upload/challenge-proof', {
        method: 'POST',
        body: formData,
      });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.success) {
        throw new Error(uploadJson.error || 'Upload failed');
      }

      const proofUrl = uploadJson.data.url as string;

      const submitRes = await fetch(
        `/api/leagues/${leagueId}/challenges/${submitChallenge.id}/submissions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ proofUrl }),
        }
      );

      const submitJson = await submitRes.json();
      if (!submitRes.ok || !submitJson.success) {
        throw new Error(submitJson.error || 'Submit failed');
      }

      toast.success('Proof submitted! Waiting for review.');
      setSubmitOpen(false);
      fetchChallenges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setUploading(false);
    }
  };

  function ReadMoreText({ text, maxChars = 120 }: { text: string; maxChars?: number }) {
    const [expanded, setExpanded] = React.useState(false);
    if (!text || text.length <= maxChars) {
      return <p className="text-sm text-muted-foreground">{text || 'No description'}</p>;
    }
    return (
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          {expanded ? text : `${text.slice(0, maxChars)}...`}
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 lg:gap-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
          <p className="text-muted-foreground">
            Participate in challenges and submit your proofs.
          </p>
        </div>
      </div>

      <div className="px-4 lg:px-6 space-y-4">
        {loading && <p className="text-muted-foreground">Loading challenges...</p>}
        {error && <p className="text-destructive">{error}</p>}

        {!loading && !error && challenges.length === 0 && (
          <div className="text-center py-12 border rounded-lg bg-muted/30">
            <FileText className="mx-auto mb-3 text-muted-foreground size-8" />
            <p className="text-muted-foreground">No active challenges at the moment.</p>
            <p className="text-sm text-muted-foreground mt-1">Check back later for new challenges.</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {challenges.map((challenge) => {
            const canSubmit =
              challenge.status === 'active' &&
              (!challenge.my_submission || challenge.my_submission.status === 'rejected') &&
              (challenge.my_submission?.status !== 'rejected' || canReuploadSubmission(challenge.my_submission));

            return (
              <Card
                key={challenge.id}
                className="flex flex-col rounded-xl border bg-card text-foreground hover:border-primary/30 transition dark:bg-gradient-to-b dark:from-[#0c1b33] dark:to-[#081425]"
              >
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-semibold leading-tight">
                      {challenge.name}
                    </CardTitle>
                    {statusBadge(challenge.status)}
                  </div>
                  <CardDescription>
                    <ReadMoreText text={challenge.description || 'No description'} />
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {getChallengeTypeLabel(challenge.challenge_type)}
                    </Badge>
                  </div>

                  {(challenge.start_date || challenge.end_date) && (
                    <div className="text-xs text-muted-foreground">
                      {challenge.start_date && <>Start: {format(parseISO(challenge.start_date), 'MMM d')}</>}
                      {challenge.start_date && challenge.end_date && ' • '}
                      {challenge.end_date && <>End: {format(parseISO(challenge.end_date), 'MMM d')}</>}
                    </div>
                  )}

                  {challenge.doc_url && (
                    <a
                      href={challenge.doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      <FileText className="size-3" />
                      View Challenge Rules
                    </a>
                  )}

                  {/* Submission Status */}
                  {challenge.my_submission && (
                    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">Your Submission</span>
                        {submissionStatusBadge(challenge.my_submission.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Submitted: {format(parseISO(challenge.my_submission.created_at), 'MMM d, h:mma')}</span>
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-primary"
                          onClick={() => {
                            setViewProofUrl(challenge.my_submission?.proof_url || null);
                            setViewProofOpen(true);
                          }}
                        >
                          <Eye className="size-3 mr-1" />
                          View Proof
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>

                <div className="mt-auto px-6 pb-5">
                  {canSubmit && (
                    <Button size="sm" onClick={() => handleOpenSubmit(challenge)}>
                      {challenge.my_submission?.status === 'rejected' ? 'Resubmit Proof' : 'Submit Proof'}
                    </Button>
                  )}

                  {challenge.my_submission?.status === 'rejected' && !canReuploadSubmission(challenge.my_submission) && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Resubmission window closed.
                    </p>
                  )}

                  {challenge.status === 'submission_closed' && !challenge.my_submission && (
                    <p className="text-xs text-muted-foreground">Submissions are closed.</p>
                  )}

                  {(challenge.status === 'published' || challenge.status === 'closed') && (
                    <p className="text-xs text-muted-foreground">Challenge completed.</p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Submit Proof Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Proof</DialogTitle>
            <DialogDescription>
              Upload an image as proof for "{submitChallenge?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Proof Image</Label>
              <Input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Allowed: JPG, PNG, GIF, WebP. Max 10MB.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadAndSubmit} disabled={uploading}>
              {uploading ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Proof Dialog */}
      <Dialog open={viewProofOpen} onOpenChange={setViewProofOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Your Submission</DialogTitle>
          </DialogHeader>
          {viewProofUrl && (
            <div className="flex items-center justify-center">
              <img src={viewProofUrl} alt="Proof" className="max-h-[70vh] object-contain rounded-lg" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
