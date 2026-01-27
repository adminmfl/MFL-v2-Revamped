'use client';

import * as React from 'react';
import { use } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Badge,
} from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Upload, Plus, CheckCircle2, Clock3, XCircle, Shield, FileText, Trash2, Share2, Copy, InfoIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useRole } from '@/contexts/role-context';
import { cn } from '@/lib/utils';
import { SubTeamManager } from '@/components/challenges/sub-team-manager';
import { getPointDistributionInfo, validateTeamChallengePoints } from '@/lib/utils/challenge-point-distribution';
import { isReuploadWindowOpen } from '@/lib/utils/reupload-window';

// Types ---------------------------------------------------------------------

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
  is_custom: boolean;
  template_id: string | null;
  pricing_id?: string | null;
  my_submission: ChallengeSubmission | null;
  stats: { pending: number; approved: number; rejected: number } | null;
};

type ChallengeSubmission = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  proof_url: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  awarded_points: number | null;
  created_at: string;
  team_id?: string | null;
};

type SubmissionRow = ChallengeSubmission & {
  league_member_id: string;
  leaguemembers?: {
    role: string | null;
    teams?: { team_name: string | null; team_id?: string } | null;
    users?: { username: string | null } | null;
  } | null;
};

// Helpers -------------------------------------------------------------------

const statusBadge = (s: Challenge['status']) => {
  switch (s) {
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'scheduled':
      return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100/80 border-blue-200">Scheduled</Badge>;
    case 'active':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200">Active</Badge>;
    case 'submission_closed':
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100/80 border-orange-200">Submissions Closed</Badge>;
    case 'published':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100/80 border-green-200">Scores Published</Badge>;
    case 'closed':
      return <Badge variant="secondary">Challenge Closed</Badge>;
    default:
      return <Badge variant="outline">{s}</Badge>;
  }
};

function submissionStatusBadge(status: ChallengeSubmission['status']) {
  const map = {
    pending: { label: 'Pending', icon: Clock3, className: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
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

// Component -----------------------------------------------------------------

export default function LeagueChallengesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = use(params);
  const tzOffsetMinutes = React.useMemo(() => new Date().getTimezoneOffset(), []);
  const { isHost, isGovernor } = useRole();
  const isAdmin = isHost || isGovernor;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [challenges, setChallenges] = React.useState<Challenge[]>([]);
  const [presets, setPresets] = React.useState<any[]>([]);
  const [pricing, setPricing] = React.useState<{ pricing_id?: string | null; per_day_rate?: number | null; tax?: number | null; admin_markup?: number | null } | null>(null);
  const [selectedPresetId, setSelectedPresetId] = React.useState<string>('');

  // Create challenge dialog state
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    name: '',
    description: '',
    challengeType: 'individual' as Challenge['challenge_type'],
    totalPoints: '' as string | number,
    docUrl: '',
  });

  // Activate preset dialog state
  const [activateOpen, setActivateOpen] = React.useState(false);

  // View Proof dialog state
  const [viewProofOpen, setViewProofOpen] = React.useState(false);
  const [viewProofUrl, setViewProofUrl] = React.useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = React.useState<any | null>(null);
  const [activateForm, setActivateForm] = React.useState({
    totalPoints: '' as string | number,
    startDate: '',
    endDate: '',
  });

  // Submit dialog state
  const [submitOpen, setSubmitOpen] = React.useState(false);
  const [submitChallenge, setSubmitChallenge] = React.useState<Challenge | null>(null);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = React.useState(false);

  // Review dialog state
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [reviewChallenge, setReviewChallenge] = React.useState<Challenge | null>(null);
  const [submissions, setSubmissions] = React.useState<SubmissionRow[]>([]);
  const [validatingId, setValidatingId] = React.useState<string | null>(null);
  const [reviewAwardedPoints, setReviewAwardedPoints] = React.useState<Record<string, number | ''>>({});
  const [reviewFilterTeamId, setReviewFilterTeamId] = React.useState<string>('');
  const [reviewFilterSubTeamId, setReviewFilterSubTeamId] = React.useState<string>('');
  const [teams, setTeams] = React.useState<Array<{ team_id: string; team_name: string }>>([]);
  const [teamMemberCounts, setTeamMemberCounts] = React.useState<Record<string, number>>({});
  const [subTeams, setSubTeams] = React.useState<Array<{ subteam_id: string; name: string }>>([]);

  // Team/Sub-team level score setting (for team & sub_team challenges)
  const [teamScores, setTeamScores] = React.useState<Record<string, number | ''>>({});
  const [subTeamScores, setSubTeamScores] = React.useState<Record<string, number | ''>>({});

  // Largest current team size (used for per-member visible cap on team challenges)
  const maxTeamSize = React.useMemo(() => {
    const sizes = Object.values(teamMemberCounts || {});
    if (!sizes.length) return 1;
    return Math.max(...sizes, 1);
  }, [teamMemberCounts]);

  const [shareOpen, setShareOpen] = React.useState(false);
  const [shareLink, setShareLink] = React.useState('');
  const [shareChallengeName, setShareChallengeName] = React.useState('');
  const [shareMessage, setShareMessage] = React.useState('');
  const canReuploadSubmission = React.useCallback(
    (submission: ChallengeSubmission | null) => {
      if (!submission || submission.status !== 'rejected') return false;
      const rejectionTime = submission.reviewed_at || submission.created_at;
      return isReuploadWindowOpen(rejectionTime, tzOffsetMinutes);
    },
    [tzOffsetMinutes]
  );
  // Finish creation dialog state (for draft challenges)
  const [finishOpen, setFinishOpen] = React.useState(false);
  const [finishChallenge, setFinishChallenge] = React.useState<Challenge | null>(null);
  const [finishStart, setFinishStart] = React.useState('');
  const [finishEnd, setFinishEnd] = React.useState('');
  const [finishing, setFinishing] = React.useState(false);

  const finishDays = React.useMemo(() => {
    if (!finishStart || !finishEnd) return 0;
    const start = new Date(finishStart);
    const end = new Date(finishEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    const diff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    return diff >= 0 ? diff + 1 : 0; // inclusive of both start and end
  }, [finishStart, finishEnd]);

  const finishAmount = React.useMemo(() => {
    if (!pricing?.per_day_rate || !finishDays) return 0;
    const base = finishDays * (pricing.per_day_rate || 0);
    const taxPercent = pricing.tax != null ? pricing.tax : 0;
    const taxMultiplier = taxPercent / 100;
    return base + taxMultiplier * base;
  }, [pricing, finishDays]);

  const finishBase = React.useMemo(() => {
    if (!pricing?.per_day_rate || !finishDays) return 0;
    return finishDays * (pricing.per_day_rate || 0);
  }, [pricing, finishDays]);

  const finishTaxPercent = pricing?.tax != null ? pricing.tax : 0;
  const finishTaxAmount = React.useMemo(() => {
    if (!finishBase) return 0;
    return finishBase * ((finishTaxPercent || 0) / 100);
  }, [finishBase, finishTaxPercent]);

  const handleOpenShare = React.useCallback(
    (challenge: Challenge) => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const url = `${origin}/leagues/${leagueId}/challenges?challenge=${challenge.id}`;
      setShareLink(url);
      setShareChallengeName(challenge.name);
      const base = 'A new challenge is online!';
      const namePart = challenge.name ? ` ${challenge.name} is live.` : '';
      const linkPart = url ? ` Jump in: ${url}` : '';
      setShareMessage(`${base}${namePart}${linkPart}`.trim());
      setShareOpen(true);
    },
    [leagueId]
  );

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage || shareLink);
      toast.success('Share message copied');
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const pricingPillClass = 'rounded-full border border-border bg-gray-100 px-3 py-1 text-xs font-medium text-foreground shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-white/80';
  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [challengeToDelete, setChallengeToDelete] = React.useState<Challenge | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  // Close dialog state
  const [closeConfirmOpen, setCloseConfirmOpen] = React.useState(false);
  const [challengeToClose, setChallengeToClose] = React.useState<Challenge | null>(null);
  const [publishingId, setPublishingId] = React.useState<string | null>(null);
  const fetchChallenges = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/challenges`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load challenges');
      }
      setChallenges(json.data?.active || []);
      setPresets(json.data?.availablePresets || []);
      setPricing(json.data?.defaultPricing || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenges');
    } finally {
      setLoading(false);
    }
  }, [leagueId]);

  React.useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  // Fetch teams for everyone so we can calculate maxTeamSize for scaling
  React.useEffect(() => {
    fetchTeams();
  }, [leagueId]);

  // Fallback: ensure pricing is loaded when finish dialog opens
  React.useEffect(() => {
    if (!finishOpen || pricing) return;
    fetch(`/api/leagues/${leagueId}/challenges`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && json?.data?.defaultPricing) {
          setPricing(json.data.defaultPricing);
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, [finishOpen, pricing, leagueId]);

  // Utility to load Razorpay script lazily
  const loadRazorpay = React.useCallback(async () => {
    if (typeof window === 'undefined') return null;
    if ((window as any).Razorpay) return (window as any).Razorpay;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.body.appendChild(script);
    });
    return (window as any).Razorpay;
  }, []);

  const handleActivatePreset = () => {
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (preset) {
      setSelectedPreset(preset);
      setActivateForm({
        totalPoints: '',
        startDate: '',
        endDate: '',
      });
      setActivateOpen(true);
    }
  };

  const handleSubmitActivation = async () => {
    if (!selectedPreset) return;

    try {
      const payload = {
        name: selectedPreset.name,
        description: selectedPreset.description || '',
        challengeType: selectedPreset.challenge_type,
        totalPoints: Number(activateForm.totalPoints) || 0,
        startDate: activateForm.startDate || null,
        endDate: activateForm.endDate || null,
        docUrl: selectedPreset.doc_url || null,
        templateId: selectedPreset.id,
        isCustom: false,
        status: 'active',
      };

      const res = await fetch(`/api/leagues/${leagueId}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to activate challenge');
      }

      toast.success('Challenge activated successfully');
      setActivateOpen(false);
      setSelectedPresetId('');
      setSelectedPreset(null);
      fetchChallenges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to activate challenge');
    }
  };

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let docUrl = createForm.docUrl || null;

      // Upload document if file selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('league_id', leagueId);

        const uploadRes = await fetch('/api/upload/challenge-document', {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Document upload failed');
        }

        docUrl = uploadData.data.url;
      }

      const payload = {
        name: createForm.name,
        description: createForm.description,
        challengeType: createForm.challengeType,
        totalPoints: Number(createForm.totalPoints) || 0,
        docUrl,
        isCustom: true,
      };

      const res = await fetch(`/api/leagues/${leagueId}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create challenge');
      }

      toast.success('Challenge created');
      setCreateOpen(false);
      setSelectedFile(null);
      setCreateForm({
        name: '',
        description: '',
        challengeType: 'individual',
        totalPoints: '',
        docUrl: '',
      });
      fetchChallenges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create challenge');
    }
  };

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

      toast.success('Submission sent for review');
      setSubmitOpen(false);
      fetchChallenges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (challenge: Challenge) => {
    setChallengeToDelete(challenge);
    setDeleteOpen(true);
  };

  const handleFinishClick = (challenge: Challenge) => {
    setFinishChallenge(challenge);
    setFinishStart(challenge.start_date || '');
    setFinishEnd(challenge.end_date || '');
    setFinishOpen(true);
  };

  const handleFinishSubmit = async () => {
    if (!finishChallenge) return;
    if (!finishStart || !finishEnd) {
      toast.error('Start date and end date are required');
      return;
    }
    if (!pricing?.per_day_rate) {
      toast.error('Pricing not available');
      return;
    }
    const base = (finishDays || 0) * (pricing.per_day_rate || 0);
    const taxPercent = pricing.tax != null ? pricing.tax : 0;
    const amount = base + (taxPercent / 100) * base;
    if (!amount || amount <= 0) {
      toast.error('Amount is invalid');
      return;
    }
    setFinishing(true);
    try {
      // Create order on server using trusted pricing
      const orderRes = await fetch('/api/payments/challenge-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          challengeId: finishChallenge.id,
          startDate: finishStart,
          endDate: finishEnd,
        }),
      });

      const orderJson = await orderRes.json();
      if (!orderRes.ok || orderJson.error) {
        throw new Error(orderJson.error || 'Failed to start payment');
      }

      const Razorpay = await loadRazorpay();
      if (!Razorpay) throw new Error('Razorpay unavailable');

      const options = {
        key: orderJson.keyId,
        amount: orderJson.amount, // paise
        currency: orderJson.currency || 'INR',
        name: 'Challenge Activation',
        description: finishChallenge.name,
        order_id: orderJson.orderId,
        notes: {
          leagueId,
          challengeId: finishChallenge.id,
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });
            const verifyJson = await verifyRes.json();
            if (!verifyRes.ok || verifyJson.error) {
              throw new Error(verifyJson.error || 'Payment verification failed');
            }

            // Activate challenge after payment confirmation
            const payload = { startDate: finishStart, endDate: finishEnd };
            const patchRes = await fetch(`/api/leagues/${leagueId}/challenges/${finishChallenge.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const patchJson = await patchRes.json();
            if (!patchRes.ok || !patchJson.success) {
              throw new Error(patchJson.error || 'Failed to update challenge after payment');
            }

            toast.success('Payment successful. Challenge activated.');
            setFinishOpen(false);
            setFinishChallenge(null);
            fetchChallenges();
          } catch (err: any) {
            toast.error(err?.message || 'Payment succeeded but activation failed');
          }
        },
        theme: { color: '#0F172A' },
      } as any;

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        toast.error(resp?.error?.description || 'Payment failed');
      });
      rzp.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to finish setup');
    } finally {
      setFinishing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!challengeToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/challenges/${challengeToDelete.id}`, {
        method: 'DELETE',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete challenge');
      }

      toast.success(`Challenge "${challengeToDelete.name}" deleted successfully`);
      setDeleteOpen(false);
      setChallengeToDelete(null);
      fetchChallenges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete challenge');
    } finally {
      setDeleting(false);
    }
  };

  const [closingId, setClosingId] = React.useState<string | null>(null);

  const handleOpenCloseConfirm = (challenge: Challenge) => {
    setChallengeToClose(challenge);
    setCloseConfirmOpen(true);
  };

  const handleCloseChallenge = async () => {
    if (!challengeToClose) return;

    setClosingId(challengeToClose.id);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/challenges/${challengeToClose.id}/close`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to close challenge');
      }
      toast.success('Challenge closed successfully');
      setCloseConfirmOpen(false);
      setChallengeToClose(null);
      fetchChallenges();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to close challenge');
    } finally {
      setClosingId(null);
    }
  };

  const fetchSubmissions = async (challenge: Challenge) => {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (reviewFilterTeamId) {
        params.append('teamId', reviewFilterTeamId);
      }
      if (reviewFilterSubTeamId) {
        params.append('subTeamId', reviewFilterSubTeamId);
      }

      const url = `/api/leagues/${leagueId}/challenges/${challenge.id}/submissions?${params.toString()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load submissions');
      }
      setSubmissions(json.data || []);
      setReviewChallenge(challenge);
      setReviewOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load submissions');
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch(`/api/leagues/${leagueId}/teams`);
      const json = await res.json();
      if (res.ok && json.success) {
        const teamsList = json.data?.teams || [];
        setTeams(teamsList);
        // Build member count map
        const counts: Record<string, number> = {};
        teamsList.forEach((team: any) => {
          counts[team.team_id] = team.member_count || 0;
        });
        setTeamMemberCounts(counts);
      }
    } catch (err) {
      console.error('Failed to load teams:', err);
    }
  };

  // Ensure we know the largest team size so per-member caps display consistently
  React.useEffect(() => {
    fetchTeams();
  }, [leagueId]);

  const fetchSubTeams = async (challengeId: string, teamId: string) => {
    try {
      console.log('[fetchSubTeams] Fetching for challenge:', challengeId, 'team:', teamId);
      const res = await fetch(
        `/api/leagues/${leagueId}/challenges/${challengeId}/subteams?teamId=${teamId}`
      );
      const json = await res.json();
      console.log('[fetchSubTeams] Response:', json);
      if (res.ok && json.success) {
        setSubTeams(json.data || []);
        console.log('[fetchSubTeams] Set sub-teams:', json.data?.length || 0, 'items');
      } else {
        console.error('[fetchSubTeams] Failed:', json.error);
      }
    } catch (err) {
      console.error('Failed to load sub-teams:', err);
    }
  };

  const handleOpenReview = async (challenge: Challenge) => {
    setReviewFilterTeamId('');
    setReviewFilterSubTeamId('');
    setSubTeams([]);

    if (challenge.challenge_type === 'team' || challenge.challenge_type === 'sub_team') {
      await fetchTeams();
    }

    // Fetch submissions without team filter initially
    await fetchSubmissions(challenge);
  };

  const handlePublish = async (challenge: Challenge) => {
    if (challenge.stats && challenge.stats.pending > 0) {
      toast.error('Review all pending submissions before publishing');
      return;
    }

    setPublishingId(challenge.id);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/challenges/${challenge.id}/publish`, {
        method: 'POST',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to publish scores');
      }
      toast.success('Scores published and challenge closed');
      fetchChallenges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish scores');
    } finally {
      setPublishingId(null);
    }
  };

  // Re-fetch submissions when filters change
  React.useEffect(() => {
    if (reviewChallenge && reviewOpen) {
      fetchSubmissions(reviewChallenge);
    }
  }, [reviewFilterTeamId, reviewFilterSubTeamId]);

  // Fetch sub-teams when team filter changes for sub_team challenges
  React.useEffect(() => {
    if (reviewChallenge?.challenge_type === 'sub_team' && reviewFilterTeamId && reviewChallenge.id) {
      setReviewFilterSubTeamId('');
      fetchSubTeams(reviewChallenge.id, reviewFilterTeamId);
    } else {
      setSubTeams([]);
    }
  }, [reviewFilterTeamId, reviewChallenge]);

  // Auto-select first team when teams are loaded
  React.useEffect(() => {
    if (teams.length > 0 && !reviewFilterTeamId && reviewOpen) {
      setReviewFilterTeamId(teams[0].team_id);
    }
  }, [teams, reviewOpen]);

  const handleValidate = async (submissionId: string, status: 'approved' | 'rejected', awardedPoints?: number | null) => {
    setValidatingId(submissionId);
    try {
      const body: any = { status };
      if (awardedPoints !== undefined) body.awardedPoints = awardedPoints;
      const res = await fetch(`/api/challenge-submissions/${submissionId}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update');
      }
      toast.success(`Submission ${status}`);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, status } : s))
      );
      fetchChallenges();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setValidatingId(null);
    }
  };

  function ReadMoreText({
    text,
    maxChars = 120,
  }: {
    text: string
    maxChars?: number
  }) {
    const [expanded, setExpanded] = React.useState(false)

    if (!text || text.length <= maxChars) {
      return (
        <p className="text-sm text-muted-foreground">
          {text || 'No description provided'}
        </p>
      )
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
    )
  }


  const emptyState = (
    <div className="text-center py-12 border rounded-lg bg-muted/30">
      <FileText className="mx-auto mb-3 text-muted-foreground" />
      <p className="text-muted-foreground">No challenges yet.</p>
      {isAdmin && (
        <Button className="mt-4" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Create Challenge
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col gap-4 lg:gap-6">
      <div className="flex flex-col gap-3 px-4 lg:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">League Challenges</h1>
          <p className="text-muted-foreground">
            Submit proof for active challenges. Hosts/Governors can review submissions.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            Create Challenge
          </Button>
        )}
      </div>

      <div className="px-4 lg:px-6 mt-6 space-y-4">
        {loading && <p className="text-muted-foreground">Loading challenges...</p>}
        {error && <p className="text-destructive">{error}</p>}

        {/* Available Presets */}
        {!loading && !error && presets.length > 0 && isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Pre-configured Challenges</CardTitle>
              <CardDescription>
                Select a challenge to activate for your league
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
                {/* Select */}
                <div className="flex-1 min-w-0 space-y-2">
                  <Label htmlFor="preset-select" className="text-sm font-medium">
                    Challenge
                  </Label>

                  <Select value={selectedPresetId} onValueChange={setSelectedPresetId}>
                    <SelectTrigger id="preset-select">
                      <SelectValue placeholder="Choose a challenge..." />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name} ({preset.challenge_type?.replace('_', ' ')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Button */}
                <Button
                  className="w-full sm:w-auto shrink-0 whitespace-nowrap"
                  onClick={handleActivatePreset}
                  disabled={!selectedPresetId}
                >
                  Activate Challenge
                </Button>
              </div>
            </CardContent>

          </Card>
        )}

        {!loading && !error && challenges.length === 0 && presets.length === 0 && emptyState}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {challenges.map((challenge) => (
            <Card
              key={challenge.id}
              className="
                  flex flex-col rounded-xl border
                  bg-card text-foreground
                  hover:border-primary/30 transition
                  dark:bg-gradient-to-b dark:from-[#0c1b33] dark:to-[#081425]
                "
            >
              {/* HEADER */}
              <CardHeader className="pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-semibold leading-tight">
                    {challenge.name}
                  </CardTitle>
                  {statusBadge(challenge.status)}
                </div>

                <CardDescription>
                  <ReadMoreText
                    text={challenge.description || 'No description provided'}
                    maxChars={120}
                  />
                </CardDescription>
              </CardHeader>

              {/* META */}
              <CardContent className="flex flex-col gap-4 text-sm">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Badge variant="outline" className="capitalize">
                    {challenge.challenge_type.replace('_', ' ')}
                  </Badge>
                </div>

                {/* Points Display */}
                {(() => {
                  const isTeamChallenge = challenge.challenge_type === 'team';
                  const perMemberMax = isTeamChallenge
                    ? Math.round((challenge.total_points || 0) / Math.max(1, maxTeamSize))
                    : challenge.total_points;

                  return (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-primary/10 dark:bg-primary/20 px-3 py-2 text-center">
                        <div className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
                          {isTeamChallenge ? 'Per Member Max' : 'Max Points'}
                          {isTeamChallenge && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="How team caps work"
                                  className="text-muted-foreground/80 hover:text-foreground transition focus:outline-none"
                                >
                                  <InfoIcon className="size-3.5" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent side="top" className="max-w-xs text-xs p-3">
                                <p className="font-semibold mb-1.5">Why this number?</p>
                                <p className="text-muted-foreground">
                                  The per-member cap uses the <strong>largest team</strong> so everyone sees the same number. Your team still shares the full team cap ({challenge.total_points}).
                                </p>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                        <div className="text-base font-semibold text-primary tabular-nums">
                          {perMemberMax}
                        </div>
                        {isTeamChallenge && (
                          <div className="mt-1 text-[10px] text-muted-foreground">Team cap {challenge.total_points}</div>
                        )}
                      </div>
                      <div className="rounded-md bg-primary/10 dark:bg-primary/20 px-3 py-2 text-center">
                        <div className="text-[11px] text-muted-foreground">Your Points</div>
                        <div className="text-base font-semibold text-primary tabular-nums">
                          {(() => {
                            if (!challenge.my_submission?.awarded_points) return '—';

                            // For team challenges, scale the points for display
                            // visible = awarded * (myTeamSize / maxTeamSize)
                            if (isTeamChallenge && challenge.my_submission.team_id) {
                              const myTeamSize = teamMemberCounts[challenge.my_submission.team_id] || 0;
                              if (myTeamSize > 0 && maxTeamSize > 0) {
                                const scaleFactor = myTeamSize / maxTeamSize;
                                const scaled = challenge.my_submission.awarded_points * scaleFactor;
                                return Math.round(scaled);
                              }
                            }

                            return challenge.my_submission.awarded_points;
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {(challenge.start_date || challenge.end_date) && (
                  <div className="text-xs text-muted-foreground">
                    {challenge.start_date && <>Start: {format(parseISO(challenge.start_date), 'MMM d')}</>}
                    {challenge.start_date && challenge.end_date && ' • '}
                    {challenge.end_date && <>End: {format(parseISO(challenge.end_date), 'MMM d')}</>}
                  </div>
                )}

                {isAdmin && challenge.stats && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="rounded-md bg-muted px-2 py-1 text-center dark:bg-white/5">
                      Pending<br />
                      <span className="font-semibold">{challenge.stats.pending}</span>
                    </div>
                    <div className="rounded-md bg-muted px-2 py-1 text-center dark:bg-white/5">
                      Approved<br />
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {challenge.stats.approved}
                      </span>
                    </div>
                    <div className="rounded-md bg-muted px-2 py-1 text-center dark:bg-white/5">
                      Rejected<br />
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {challenge.stats.rejected}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>

              {/* ACTIONS */}
              <div className="mt-auto px-6 pb-5 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleOpenSubmit(challenge)}
                    disabled={
                      challenge.status === 'draft' ||
                      challenge.status === 'scheduled' ||
                      challenge.status === 'published' ||
                      challenge.status === 'closed' ||
                      (challenge.status === 'submission_closed' && challenge.my_submission?.status !== 'rejected') ||
                      (challenge.my_submission && challenge.my_submission.status !== 'rejected') ||
                      (challenge.my_submission?.status === 'rejected' && !canReuploadSubmission(challenge.my_submission))
                    }
                  >
                    {challenge.my_submission?.status === 'rejected' ? 'Resubmit Proof' : 'Submit Proof'}
                  </Button>

                  {challenge.status === 'active' && (
                    <Button size="sm" variant="outline" onClick={() => handleOpenShare(challenge)}>
                      <Share2 className="mr-2 size-4" />
                      Share
                    </Button>
                  )}

                  {challenge.my_submission &&
                    submissionStatusBadge(challenge.my_submission.status)}

                  {isAdmin && (
                    challenge.status === 'draft' ? (
                      <Button
                        size="sm"
                        onClick={() => handleFinishClick(challenge)}
                        className="ml-auto"
                      >
                        Finish Creation
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReview(challenge)}
                        disabled={challenge.status !== 'submission_closed' && challenge.status !== 'published'}
                        title={['submission_closed', 'published'].includes(challenge.status) ? '' : 'Reviews open after submissions close'}
                        className="ml-auto"
                      >
                        Review
                      </Button>
                    )
                  )}

                  {isAdmin && challenge.status === 'submission_closed' && (
                    <Button
                      size="sm"
                      onClick={() => handlePublish(challenge)}
                      disabled={publishingId === challenge.id || (challenge.stats?.pending ?? 0) > 0}
                    >
                      {publishingId === challenge.id ? 'Publishing...' : 'Publish Scores'}
                    </Button>
                  )}

                  {isAdmin && challenge.status === 'published' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleOpenCloseConfirm(challenge)}
                      disabled={closingId === challenge.id}
                      className="ml-2"
                    >
                      Finalize & Close Challenge
                    </Button>
                  )}
                </div>

                {challenge.my_submission?.status === 'rejected' && !canReuploadSubmission(challenge.my_submission) && (
                  <p className="text-xs text-muted-foreground">Reupload window closed (next-day 11:59pm local time).</p>
                )}

                {isAdmin && challenge.status === 'submission_closed' && (challenge.stats?.pending ?? 0) > 0 && (
                  <p className="text-xs text-muted-foreground">Review pending submissions before publishing.</p>
                )}

                {isAdmin && (
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {challenge.challenge_type === 'sub_team' && ['draft', 'scheduled', 'upcoming'].includes(challenge.status) && (
                      <SubTeamManager
                        leagueId={leagueId}
                        challengeId={challenge.id}
                        teams={teams}
                      />
                    )}

                    {isHost && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteClick(challenge)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>

          ))}
        </div>
      </div>

      {/* Create Challenge Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Custom Challenge</DialogTitle>
            <DialogDescription>
              Set up a new league-scoped challenge.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateChallenge} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={createForm.challengeType}
                  onValueChange={(val) =>
                    setCreateForm((p) => ({ ...p, challengeType: val as Challenge['challenge_type'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="sub_team">Sub-team</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Points</Label>
                <Input
                  type="number"
                  value={createForm.totalPoints}
                  min={0}
                  onChange={(e) => setCreateForm((p) => ({ ...p, totalPoints: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  {createForm.challengeType === 'individual' && '💡 Points per person'}
                  {createForm.challengeType === 'team' && '💡 Total points for entire team (divided fairly among members)'}
                  {createForm.challengeType === 'sub_team' && '💡 Total points for entire sub-team (divided fairly among members)'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-upload">Challenge Rules Document (Optional)</Label>
              <Input
                id="doc-upload"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Upload rules as PDF, Word document, or image (max 10MB)
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activate Pre-configured Challenge Dialog */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Activate Challenge</DialogTitle>
            <DialogDescription>
              Configure points and dates for this challenge
            </DialogDescription>
          </DialogHeader>
          {selectedPreset && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <h3 className="font-semibold">{selectedPreset.name}</h3>
                {selectedPreset.description && (
                  <p className="text-sm text-muted-foreground">{selectedPreset.description}</p>
                )}
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {selectedPreset.challenge_type?.replace('_', ' ')}
                  </Badge>
                  {selectedPreset.doc_url && (
                    <a
                      href={selectedPreset.doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <FileText className="size-3" />
                      View Rules
                    </a>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="activate-points">Total Points</Label>
                <Input
                  id="activate-points"
                  type="number"
                  min={0}
                  value={activateForm.totalPoints}
                  onChange={(e) =>
                    setActivateForm((p) => ({ ...p, totalPoints: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {selectedPreset?.challenge_type === 'individual' && '💡 Points per person'}
                  {selectedPreset?.challenge_type === 'team' && '💡 Total points for entire team (divided fairly among members)'}
                  {selectedPreset?.challenge_type === 'sub_team' && '💡 Total points for entire sub-team (divided fairly among members)'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="activate-start">Start Date</Label>
                  <Input
                    id="activate-start"
                    type="date"
                    value={activateForm.startDate}
                    onChange={(e) => setActivateForm((p) => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="activate-end">End Date</Label>
                  <Input
                    id="activate-end"
                    type="date"
                    value={activateForm.endDate}
                    onChange={(e) => setActivateForm((p) => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitActivation}>
              Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Proof Dialog */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Proof</DialogTitle>
            <DialogDescription>
              Upload an image as proof for {submitChallenge?.name || 'this challenge'}.
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

      {/* Review Dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Submissions</DialogTitle>
            <DialogDescription>
              {reviewChallenge?.name || 'Challenge'} ({reviewChallenge?.challenge_type})
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          {reviewChallenge && (reviewChallenge.challenge_type === 'team' || reviewChallenge.challenge_type === 'sub_team') && (
            <div className="space-y-3 pb-3 border-b">
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Team Selector */}
                {teams.length > 0 && (
                  <div>
                    <Label htmlFor="filter-team">Filter by Team (optional)</Label>
                    <Select value={reviewFilterTeamId} onValueChange={setReviewFilterTeamId}>
                      <SelectTrigger id="filter-team">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((team) => (
                          <SelectItem key={team.team_id} value={team.team_id}>
                            {team.team_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sub-Team Selector (only for sub_team challenges) */}
                {reviewChallenge.challenge_type === 'sub_team' && reviewFilterTeamId && (
                  <div>
                    <Label htmlFor="filter-subteam">Filter by Sub-Team (optional)</Label>
                    <Select value={reviewFilterSubTeamId} onValueChange={setReviewFilterSubTeamId}>
                      <SelectTrigger id="filter-subteam">
                        <SelectValue placeholder={subTeams.length === 0 ? 'No sub-teams created' : 'Select sub-team...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {subTeams.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            No sub-teams for this team
                          </div>
                        ) : (
                          subTeams.map((subTeam) => (
                            <SelectItem key={subTeam.subteam_id} value={subTeam.subteam_id}>
                              {subTeam.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {submissions.length === 0 && (
              <p className="text-muted-foreground text-sm">No submissions yet.</p>
            )}
            {submissions.length > 0 && reviewChallenge && (
              <div className="space-y-4">
                {/* Point Distribution Info for Team Challenges */}
                {reviewChallenge.challenge_type === 'team' && reviewFilterTeamId && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-950/20 p-4">
                    <div className="flex items-start gap-3">
                      <InfoIcon className="size-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2 flex-1">
                        <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Team Challenge Point Distribution</h4>
                        {(() => {
                          const teamSize = teamMemberCounts[reviewFilterTeamId] || 0;
                          const total = reviewChallenge.total_points || 0;
                          if (teamSize === 0) return <p className="text-xs text-blue-800 dark:text-blue-200">Loading team info...</p>;

                          const internalCap = Math.round((total / Math.max(teamSize, 1)) * 100) / 100; // I
                          const visibleCap = Math.round((total / Math.max(maxTeamSize, 1)) * 100) / 100; // V
                          const distribution = getPointDistributionInfo(total, teamSize, reviewChallenge.challenge_type);

                          return (
                            <div className="space-y-1 text-xs">
                              <p className="text-blue-800 dark:text-blue-200">{distribution.description}</p>
                              <p className="text-blue-700 dark:text-blue-300">Internal per-member cap (I): {internalCap} (used for backend validation)</p>
                              <p className="text-blue-700 dark:text-blue-300">Player-visible per-member cap (V): {visibleCap} (shown to all teams, based on largest team size)</p>
                              <p className="text-blue-700 dark:text-blue-300">Awarded points are scaled for visibility: visible = (awarded / I) × V, capped at V.</p>
                            </div>
                          );
                        })()}
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          💡 This keeps effort fair across team sizes and makes the player-facing points consistent.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {submissions.map((s) => {
                  const username = s.leaguemembers?.users?.username || 'Member';
                  const teamName = s.leaguemembers?.teams?.team_name;
                  const teamId = s.leaguemembers?.teams?.team_id;
                  const teamSize = teamId ? (teamMemberCounts[teamId] || 0) : 0;

                  // Calculate validation for this submission
                  const currentPoints = reviewAwardedPoints[s.id] !== '' ? reviewAwardedPoints[s.id] : s.awarded_points;
                  const validation = validateTeamChallengePoints(
                    typeof currentPoints === 'number' ? currentPoints : 0,
                    reviewChallenge.total_points,
                    teamSize,
                    reviewChallenge.challenge_type
                  );

                  return (
                    <div key={s.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2 justify-between">
                        <div>
                          <p className="font-medium">{username}</p>
                          <p className="text-xs text-muted-foreground">
                            {teamName || 'Unassigned'}
                          </p>
                        </div>
                        {submissionStatusBadge(s.status)}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Submitted: {format(parseISO(s.created_at), 'MMM d, yyyy h:mma')}</p>
                        {s.reviewed_at && (
                          <p>Reviewed: {format(parseISO(s.reviewed_at), 'MMM d, yyyy h:mma')}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="link"
                          className="h-auto p-0 text-primary underline"
                          onClick={() => {
                            setViewProofUrl(s.proof_url);
                            setViewProofOpen(true);
                          }}
                        >
                          View Proof
                        </Button>
                        {isAdmin && (
                          <div className="flex gap-2 ml-auto items-center flex-wrap">
                            {(s.status === 'pending' || s.status === 'approved') && (
                              <div className="flex flex-col gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  max={validation.maxAllowed}
                                  placeholder="Points"
                                  value={reviewAwardedPoints[s.id] ?? s.awarded_points ?? ''}
                                  onChange={(e) =>
                                    setReviewAwardedPoints((p) => ({ ...p, [s.id]: e.target.value === '' ? '' : Number(e.target.value) }))
                                  }
                                  className={cn(
                                    'w-28',
                                    typeof currentPoints === 'number' && !validation.valid && 'border-red-500 focus:ring-red-500'
                                  )}
                                />
                                {reviewChallenge.challenge_type === 'team' && teamSize > 0 && (
                                  <span className="text-xs text-muted-foreground">
                                    Max: {validation.maxAllowed}
                                  </span>
                                )}
                                {typeof currentPoints === 'number' && !validation.valid && (
                                  <span className="text-xs text-red-600 font-medium">
                                    {validation.reason}
                                  </span>
                                )}
                              </div>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={validatingId === s.id}
                              onClick={() => handleValidate(s.id, 'rejected', null)}
                              className={s.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : ''}
                            >
                              {s.status === 'rejected' ? 'Rejected' : 'Reject'}
                            </Button>
                            <Button
                              size="sm"
                              disabled={
                                validatingId === s.id ||
                                (typeof currentPoints === 'number' && !validation.valid)
                              }
                              onClick={() => handleValidate(s.id, 'approved', reviewAwardedPoints[s.id] === '' ? undefined : (reviewAwardedPoints[s.id] as number))}
                            >
                              {s.status === 'approved' ? 'Update' : 'Approve'}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Finish Creation Dialog */}
      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Finish Challenge Creation</DialogTitle>
            <DialogDescription>
              Set start and end dates to move this challenge out of draft.
            </DialogDescription>
          </DialogHeader>
          {finishChallenge?.challenge_type === 'sub_team' && (
            <div className="rounded-md border bg-white/50 dark:bg-muted/40 p-3 text-sm space-y-2 text-foreground dark:text-white mb-4">
              <p className="font-medium">Need sub-teams?</p>
              <p className="text-muted-foreground">
                Create sub-teams before activating this challenge.
              </p>
              <div>
                <SubTeamManager leagueId={leagueId} challengeId={finishChallenge.id} teams={teams} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="finish-start">Start Date</Label>
              <Input
                id="finish-start"
                type="date"
                value={finishStart}
                onChange={(e) => setFinishStart(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="finish-end">End Date</Label>
              <Input
                id="finish-end"
                type="date"
                value={finishEnd}
                onChange={(e) => setFinishEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-white text-foreground shadow-2xl dark:bg-[#0d1930] dark:text-white dark:border-primary/20">
            <div className="flex flex-col gap-3 px-4 pt-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-lg font-semibold leading-tight">
                  {finishChallenge?.name || 'Challenge Pricing'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {finishChallenge?.description || 'Review duration and payable amount before activation.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`${pricingPillClass} bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-500/10 dark:text-blue-100 dark:border-blue-500/30`}>Draft</span>
                <span className={`${pricingPillClass} bg-green-50 text-green-800 border-green-200 dark:bg-green-500/10 dark:text-green-100 dark:border-green-500/30`}>Pay to Activate</span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 px-4">
              <span className={pricingPillClass}>
                Duration: {finishDays || '-'} day{finishDays === 1 ? '' : 's'}
              </span>
              {finishChallenge?.challenge_type && (
                <span className={pricingPillClass}>
                  Type: {finishChallenge.challenge_type.replace('_', ' ')}
                </span>
              )}
              <span className={pricingPillClass}>
                Points: {finishChallenge?.total_points ?? 0}
              </span>
            </div>

            <div className="mt-4 border-t border-border px-4 py-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Base amount</p>
                <p className="text-xl font-semibold">₹{finishBase.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  ₹{pricing?.per_day_rate?.toFixed ? pricing.per_day_rate.toFixed(2) : pricing?.per_day_rate ?? '—'} × {finishDays || 0} day{finishDays === 1 ? '' : 's'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tax</p>
                <p className="text-xl font-semibold">₹{finishTaxAmount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{finishTaxPercent?.toFixed ? finishTaxPercent.toFixed(2) : finishTaxPercent}%</p>
              </div>

              <div className="sm:col-span-2 rounded-lg border px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-white/5 border-border dark:border-white/10">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total payable</p>
                  <p className="text-2xl font-bold">₹{finishAmount.toFixed(2)}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground space-y-1">
                  {pricing?.admin_markup != null && (
                    <p>Admin markup: {pricing.admin_markup.toFixed ? pricing.admin_markup.toFixed(2) : pricing.admin_markup}%</p>
                  )}
                  <p>Includes taxes</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishOpen(false)} disabled={finishing}>
              Cancel
            </Button>
            <Button onClick={handleFinishSubmit} disabled={finishing}>
              {finishing ? 'Processing...' : 'Pay & Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Challenge</DialogTitle>
            <DialogDescription>
              Send this link so others can open the challenge page directly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Challenge</Label>
              <p className="text-sm text-foreground">{shareChallengeName || 'Challenge'}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-link">Shareable link</Label>
              <div className="flex gap-2">
                <Input id="share-link" value={shareLink} readOnly className="font-mono text-xs" />
                <Button type="button" variant="outline" onClick={handleCopyShare}>
                  <Copy className="mr-2 size-4" />
                  Copy message
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="share-message">Preview message</Label>
              <Textarea
                id="share-message"
                value={shareMessage}
                onChange={(e) => setShareMessage(e.target.value)}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Edit the message before sharing; the link stays included.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Challenge Confirmation Dialog */}
      <AlertDialog
        open={closeConfirmOpen}
        onOpenChange={(open) => {
          setCloseConfirmOpen(open);
          if (!open) {
            setChallengeToClose(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize & Close Challenge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to finalize and close {challengeToClose ? `"${challengeToClose.name}"` : 'this challenge'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingId === challengeToClose?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseChallenge}
              disabled={closingId === challengeToClose?.id}
              className="bg-destructive hover:bg-destructive/90"
            >
              {closingId === challengeToClose?.id ? 'Closing...' : 'Finalize & Close'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Challenge Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Challenge</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{challengeToDelete?.name}"</strong>? This action cannot be undone. All submissions will be preserved but the challenge will no longer be available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete Challenge'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Proof Dialog */}
      <Dialog open={viewProofOpen} onOpenChange={setViewProofOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submission Proof</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-2">
            {viewProofUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewProofUrl}
                alt="Proof"
                className="max-w-full max-h-[70vh] rounded-md object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
