/**
 * Submit Activity Page
 * Allows players to submit workout entries with proof image upload.
 */
'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import Tesseract from 'tesseract.js';
import Confetti from 'react-confetti';
import {
  Dumbbell,
  Upload,
  Calendar as CalendarIcon,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Image as ImageIcon,
  X,
  AlertCircle,
  PartyPopper,
  RotateCcw,
  Eye,
  Moon,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';

import { useLeague } from '@/contexts/league-context';
import { useRole } from '@/contexts/role-context';
import { useLeagueActivities, LeagueActivity } from '@/hooks/use-league-activities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// ============================================================================
// Rest Day Stats Interface
// ============================================================================

interface RestDayStats {
  totalAllowed: number;
  used: number;
  pending: number;
  remaining: number;
  isAtLimit: boolean;
  exemptionsPending: number;
}

// ============================================================================
// Activity Type Interface
// ============================================================================

interface ActivityType {
  value: string;
  label: string;
  description?: string | null;
}

// ============================================================================
// Submit Activity Page
// ============================================================================

export default function SubmitActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: leagueId } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeLeague } = useLeague();
  const { canSubmitWorkouts } = useRole();

  // Check if this is a resubmission
  const resubmitId = searchParams.get('resubmit');
  const isResubmission = !!resubmitId;

  // Fetch league activities
  const {
    data: activitiesData,
    isLoading: activitiesLoading,
    error: activitiesError,
    errorCode: activitiesErrorCode,
  } = useLeagueActivities(leagueId);

  // Transform fetched activities to the format needed by the UI
  const activityTypes: ActivityType[] = React.useMemo(() => {
    if (!activitiesData?.activities) return [];
    return activitiesData.activities.map((activity) => ({
      value: activity.value,
      label: activity.activity_name,
      description: activity.description,
    }));
  }, [activitiesData?.activities]);

  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [submittedData, setSubmittedData] = React.useState<any>(null);
  const [activityDate, setActivityDate] = React.useState<Date>(new Date());
  const [formData, setFormData] = React.useState({
    activity_type: '',
    duration: '',
    distance: '',
    steps: '',
    holes: '',
    notes: '',
  });

  // Submission type tab state
  const [submissionType, setSubmissionType] = React.useState<'workout' | 'rest'>('workout');

  React.useEffect(() => {
    if (resubmitId) return;
    const typeParam = searchParams.get('type');
    if (typeParam === 'rest') {
      setSubmissionType('rest');
    } else if (typeParam === 'workout') {
      setSubmissionType('workout');
    }
  }, [searchParams, resubmitId]);

  // Whether the active league has completed
  const isLeagueCompleted = React.useMemo(() => {
    if (!activeLeague) return false;
    if (activeLeague.status === 'completed') return true;
    if (activeLeague.end_date) {
      try {
        // Parse end date as UTC midnight
        // Ensure we handle ISO strings by taking only the 'YYYY-MM-DD' portion
        const [y, m, d] = String(activeLeague.end_date).slice(0, 10).split('-').map(Number);
        const cutoff = new Date(Date.UTC(y, m - 1, d));

        // Add 1 day + 9 hours = 33 hours
        cutoff.setHours(cutoff.getHours() + 33);
        cutoff.setMinutes(0); // Reset minutes to 0 for exactly 9:00 AM

        const now = new Date();
        return now > cutoff;
      } catch {
        return false;
      }
    }
    return false;
  }, [activeLeague]);

  // Determine max allowed activity date (League End Date or Today, whichever is earlier)
  const maxActivityDate = React.useMemo(() => {
    if (!activeLeague?.end_date) return new Date();

    // Parse end date (safely handle various formats if needed, assuming YYYY-MM-DD or ISO)
    try {
      const endString = String(activeLeague.end_date).slice(0, 10);
      const endDate = parseISO(endString);
      const today = new Date();

      // If today is BEFORE the end date, use today (can't submit future workouts)
      // If today is AFTER the end date, use end date (can't submit for days after league ended)
      if (today < endDate) return today;
      return endDate;
    } catch (e) {
      return new Date();
    }
  }, [activeLeague]);

  // Effect to clamp activityDate to maxActivityDate if it exceeds it
  // This handles the case where "Today" (default) is after the league end date
  React.useEffect(() => {
    if (activeLeague?.end_date && maxActivityDate) {
      const currentYmd = format(activityDate, 'yyyy-MM-dd');
      const maxYmd = format(maxActivityDate, 'yyyy-MM-dd');

      if (currentYmd > maxYmd) {
        setActivityDate(maxActivityDate);
        toast.info(`Date adjusted to League End Date (${maxYmd})`);
      }
    }
  }, [activeLeague?.end_date, maxActivityDate, activityDate]);

  // Rest day stats
  const [restDayStats, setRestDayStats] = React.useState<RestDayStats | null>(null);
  const [restDayLoading, setRestDayLoading] = React.useState(false);
  const [restDayReason, setRestDayReason] = React.useState('');
  const [isExemptionRequest, setIsExemptionRequest] = React.useState(false);

  // Fetch rest day stats
  const fetchRestDayStats = React.useCallback(async () => {
    if (!leagueId) return;
    setRestDayLoading(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/rest-days`);
      const result = await response.json();
      if (response.ok && result.success) {
        setRestDayStats(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch rest day stats:', error);
    } finally {
      setRestDayLoading(false);
    }
  }, [leagueId]);

  // Fetch rest day stats on mount and when switching to rest tab
  React.useEffect(() => {
    if (submissionType === 'rest') {
      fetchRestDayStats();
    }
  }, [submissionType, fetchRestDayStats]);

  // Pre-fill form data when resubmitting
  React.useEffect(() => {
    if (resubmitId) {
      const dateParam = searchParams.get('date');
      const typeParam = searchParams.get('type');
      const workoutTypeParam = searchParams.get('workout_type');
      const durationParam = searchParams.get('duration');
      const distanceParam = searchParams.get('distance');
      const stepsParam = searchParams.get('steps');
      const holesParam = searchParams.get('holes');
      const notesParam = searchParams.get('notes');
      const proofUrlParam = searchParams.get('proof_url');

      // Set submission type
      if (typeParam === 'rest') {
        setSubmissionType('rest');
      } else {
        setSubmissionType('workout');
      }

      // Set date
      if (dateParam) {
        try {
          setActivityDate(parseISO(dateParam));
        } catch (e) {
          console.error('Invalid date parameter:', e);
        }
      }

      // Set form data
      setFormData({
        activity_type: workoutTypeParam || '',
        duration: durationParam || '',
        distance: distanceParam || '',
        steps: stepsParam || '',
        holes: holesParam || '',
        notes: notesParam || '',
      });

      // Set proof URL as image preview (if it's a URL)
      if (proofUrlParam) {
        setImagePreview(proofUrlParam);
      }

      toast.info('Resubmitting rejected workout. Update as needed.');
    }
  }, [resubmitId, searchParams]);

  // Image upload state - store file in memory until submission
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // OCR state
  const [ocrProcessing, setOcrProcessing] = React.useState(false);
  const [ocrDialogOpen, setOcrDialogOpen] = React.useState(false);
  const [ocrResult, setOcrResult] = React.useState<{ raw: string; minutes: number } | null>(null);

  // Confetti state for success dialog
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [windowSize, setWindowSize] = React.useState({ width: 0, height: 0 });

  // Window size for confetti
  React.useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateWindowSize();
    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  // Trigger confetti on success after 500ms
  React.useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        setShowConfetti(true);
        // Stop confetti after 5 seconds
        setTimeout(() => setShowConfetti(false), 5000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [submitted]);

  const selectedActivity = React.useMemo<LeagueActivity | null>(() => {
    if (!activitiesData?.activities || !formData.activity_type) return null;
    return activitiesData.activities.find((a: any) => a.value === formData.activity_type) || null;
  }, [activitiesData?.activities, formData.activity_type]);

  // Estimated RR calculation (simplified - actual calculation done on backend)
  const estimatedRR = React.useMemo(() => {
    if (!selectedActivity) return 0;
    const activityValue = selectedActivity?.value || formData.activity_type;

    let maxRR = 0;

    // Distance
    if (formData.distance) {
      const val = parseFloat(formData.distance);
      if (!isNaN(val) && val > 0) {
        // Generic approximation (4km = 1.0 RR)
        maxRR = Math.max(maxRR, Math.min(val / 4.0, 2.0));
      }
    }

    // Steps
    if (formData.steps) {
      const val = parseInt(formData.steps);
      if (!isNaN(val) && val >= 10000) {
        maxRR = Math.max(maxRR, Math.min(1 + (val - 10000) / 10000, 2.0));
      }
    }

    // Holes
    if (formData.holes) {
      const val = parseInt(formData.holes);
      if (!isNaN(val) && val > 0) {
        maxRR = Math.max(maxRR, Math.min(val / 9, 2.0));
      }
    }

    // Duration
    if (formData.duration) {
      const val = parseInt(formData.duration);
      if (!isNaN(val) && val > 0) {
        maxRR = Math.max(maxRR, Math.min(val / 45, 2.0));
      }
    }

    // If no metrics provided but activity selected, explicitly show 0 until input
    if (maxRR === 0 && (formData.duration || formData.distance || formData.steps || formData.holes)) {
      return 0;
    }

    // Default to 1.0 only if nothing entered yet? No, better to show 0.
    // Actually existing logic returned 1.0 at end, maybe for 'rest' or just default?
    // Let's return maxRR (which is 0 if empty) 
    // BUT we want to avoid showing 0.0 RR if the user hasn't typed anything yet?
    // The previous logic returned 1.0 at the end. Let's keep that behavior if nothing is entered to be safe?
    // No, accurate is better.

    return maxRR > 0 ? maxRR : 1.0;
  }, [selectedActivity, formData]);

  // Parse workout time from OCR text
  const parseWorkoutTime = (text: string): { raw: string; minutes: number } | null => {
    const timePattern = /(\d{1,2}):(\d{2}):(\d{2})/;
    const match = text.match(timePattern);

    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);
      const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);

      return {
        raw: `${match[1]}:${match[2]}:${match[3]}`,
        minutes: totalMinutes,
      };
    }

    return null;
  };

  // Handle file selection - store in memory, don't upload yet
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPG, PNG, GIF, WebP');
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 10MB');
      return;
    }

    // Store file in memory
    setSelectedFile(file);

    // Create image preview from memory
    const reader = new FileReader();
    reader.onload = (event) => {
      setImagePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    toast.success('Image selected. It will be uploaded when you submit.');

    // Try OCR processing on the local file
    setOcrProcessing(true);
    try {
      const ocrResult = await Tesseract.recognize(file, 'eng', {
        logger: (m) => console.log(m),
      });

      const workoutTime = parseWorkoutTime(ocrResult.data.text);

      if (workoutTime) {
        setOcrResult(workoutTime);
        setFormData((prev) => ({ ...prev, duration: workoutTime.minutes.toString() }));
        setOcrDialogOpen(true);
      }
    } catch (ocrError) {
      console.warn('OCR processing failed:', ocrError);
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================================================
  // Overwrite Confirmation State
  // ============================================================================
  const [existingEntry, setExistingEntry] = React.useState<any>(null);
  const [overwriteDialogOpen, setOverwriteDialogOpen] = React.useState(false);
  const [viewProofUrl, setViewProofUrl] = React.useState<string | null>(null);

  // Check for existing entry when date changes
  React.useEffect(() => {
    const checkExisting = async () => {
      if (!leagueId || !activityDate) return;

      const dateStr = format(activityDate, 'yyyy-MM-dd');
      // Only check if we are not in resubmit mode (resubmit targets a specific ID anyway)
      if (resubmitId) return;

      try {
        // Use my-submissions API to check for entry on this date
        const res = await fetch(
          `/api/leagues/${leagueId}/my-submissions?startDate=${dateStr}&endDate=${dateStr}`
        );
        const json = await res.json();

        if (res.ok && json.success && json.data.submissions.length > 0) {
          // Found an existing entry
          // We only care about the first one (should be only one per date usually, but API returns list)
          // Also, if it's rejected, we might not need to warn? Backend logic handles "canReplaceRejected".
          // But user wants to know what they uploaded.
          const entry = json.data.submissions[0];
          setExistingEntry(entry);
        } else {
          setExistingEntry(null);
        }
      } catch (err) {
        console.error('Failed to check existing entry:', err);
      }
    };

    // Debounce slightly or just run
    checkExisting();
  }, [leagueId, activityDate, resubmitId]);

  // Submit the activity (step 1: validation and check)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmissionFlow(false);
  };

  const handleSubmissionFlow = async (overwrite: boolean) => {
    if (!formData.activity_type) {
      toast.error('Please select an activity type');
      return;
    }

    // Determine which metric is being used
    const primaryMetric = selectedActivity?.measurement_type || 'duration';
    const secondaryMetric = selectedActivity?.settings?.secondary_measurement_type;

    // Check which fields have values
    const hasPrimary = !!formData[primaryMetric as keyof typeof formData];
    const hasSecondary = secondaryMetric ? !!formData[secondaryMetric as keyof typeof formData] : false;

    // Validation: Exactly one must be provided
    if (secondaryMetric) {
      if (!hasPrimary && !hasSecondary) {
        toast.error(`Please enter either ${primaryMetric} or ${secondaryMetric}`);
        return;
      }
      if (hasPrimary && hasSecondary) {
        toast.error(`Please enter ONLY ${primaryMetric} OR ${secondaryMetric}, not both`);
        return;
      }
    } else {
      // Single metric case
      if (!hasPrimary) {
        toast.error(`Please enter ${primaryMetric}`);
        return;
      }
    }

    // Existing RR Validation Logic
    try {
      const previewPayload: Record<string, any> = {
        league_id: leagueId,
        type: 'workout',
        workout_type: formData.activity_type,
      };

      // Only include the fields that have values (and clear 0s/empty)
      if (formData.duration) previewPayload.duration = parseInt(formData.duration);
      if (formData.distance) previewPayload.distance = parseFloat(formData.distance);
      if (formData.steps) previewPayload.steps = parseInt(formData.steps);
      if (formData.holes) previewPayload.holes = parseInt(formData.holes);

      const previewRes = await fetch('/api/entries/preview-rr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(previewPayload),
      });
      const previewJson = await previewRes.json();
      if (!previewRes.ok) {
        throw new Error(previewJson.error || 'Failed to validate RR');
      }
      const canSubmit = Boolean(previewJson?.data?.canSubmit);
      if (!canSubmit) {
        toast.error('Workout RR must be at least 1.0 to submit. Please increase your effort.');
        return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to validate RR');
      return;
    }

    if (!selectedFile && !overwrite && !resubmitId) {
      // If overwriting and proof_url exists on previous entry, backend might allow skipping upload?
      // Logic in backend: "if type=workout and !proof_url and !(canReplaceRejected && existing.proof_url)..."
      // If we are overwriting an APPROVED entry, does backend require new proof?
      // Check backend: "if (type === 'workout' && !proof_url && !(canReplaceRejected && existing?.proof_url))"
      // It seems it allows reuse ONLY if canReplaceRejected.
      // So if overwriting an APPROVED entry, we might need a new proof OR allow existing.
      // Current backend logic seems to demand proof_url unless replacing rejected.
      // Let's demand proof for now to be safe, unless user explicitly didn't change it?
      // For now, simplify: Always require proof for new submissions.
      toast.error('Proof screenshot is required');
      return;
    }

    // Check for overwrite need
    if (!overwrite && existingEntry && !resubmitId) {
      // If existing entry is found, prompt user
      setOverwriteDialogOpen(true);
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload image to bucket if one is selected
      let proofUrl: string | null = null;
      if (selectedFile) {
        setUploadingImage(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        uploadFormData.append('league_id', leagueId);

        const uploadResponse = await fetch('/api/upload/proof', {
          method: 'POST',
          body: uploadFormData,
        });

        const uploadResult = await uploadResponse.json();

        if (!uploadResponse.ok) {
          throw new Error(uploadResult.error || 'Failed to upload proof image');
        }

        proofUrl = uploadResult.data.url;
        setUploadingImage(false);
      } else if (overwrite && existingEntry?.proof_url) {
        // If overwriting and no new file, theoretically could use old URL?
        // But currently backend might block if we don't send proof_url?
        // Backend: "proof_url: proof_url || null". Destructured from body.
        // If we send proof_url: existingEntry.proof_url, it should work.
        proofUrl = existingEntry.proof_url;
      }

      // Step 2: Submit the activity entry
      const payload: Record<string, any> = {
        league_id: leagueId,
        date: format(activityDate, 'yyyy-MM-dd'),
        type: 'workout',
        workout_type: formData.activity_type,
        proof_url: proofUrl,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
        ianaTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        overwrite: overwrite
      };

      // Add relevant metrics based on what was entered
      if (formData.duration) payload.duration = parseInt(formData.duration);
      if (formData.distance) payload.distance = parseFloat(formData.distance);
      if (formData.steps) payload.steps = parseInt(formData.steps);
      if (formData.holes) payload.holes = parseInt(formData.holes);


      // Add notes if provided
      if (formData.notes) {
        payload.notes = formData.notes;
      }

      // Add reupload_of if this is a resubmission
      if (resubmitId) {
        payload.reupload_of = resubmitId;
      }

      const response = await fetch('/api/entries/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409 && result.existing) {
          // Fallback if our frontend check missed it
          setExistingEntry(result.existing);
          setOverwriteDialogOpen(true);
          return;
        }
        throw new Error(result.error || 'Failed to submit activity');
      }

      setSubmittedData(result.data);
      setSubmitted(true);
      if (isLeagueCompleted) {
        toast.success('League completed — you did great! Your submission has been recorded.');
      } else {
        toast.success('Activity submitted successfully!');
      }

      // Clear existing entry state since we just replaced it
      setExistingEntry(null);
      setOverwriteDialogOpen(false);

    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit activity');
      setUploadingImage(false);
    } finally {
      setLoading(false);
    }
  };

  // Submit rest day
  const handleRestDaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Check if this is an exemption request (over limit)
      const needsExemption = restDayStats?.isAtLimit || false;

      const payload: Record<string, any> = {
        league_id: leagueId,
        date: format(activityDate, 'yyyy-MM-dd'),
        type: 'rest',
        tzOffsetMinutes: new Date().getTimezoneOffset(), // Send user's timezone offset (same as new Date().getTimezoneOffset())
        ianaTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
        // Add notes - if exemption, prefix with marker
        notes: needsExemption
          ? `[EXEMPTION_REQUEST] ${restDayReason || 'Rest day exemption requested'}`
          : restDayReason || undefined,
        overwrite: true // Allow overwriting rest days freely if needed? Assuming yes for now, or we can check too.
        // For simplicity, let's treat rest days as simpler. But ideally should warn here too.
        // Given user request was about "uploaded", likely focused on workout.
      };

      const response = await fetch('/api/entries/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit rest day');
      }

      setSubmittedData({
        ...result.data,
        isRestDay: true,
        isExemption: needsExemption,
      });
      setSubmitted(true);

      if (needsExemption) {
        toast.success('Rest day exemption request submitted! Awaiting approval.');
      } else {
        if (isLeagueCompleted) {
          toast.success('League completed — you did great! Your rest day has been recorded.');
        } else {
          toast.success('Rest day logged successfully!');
        }
      }

      // Refresh rest day stats
      fetchRestDayStats();
    } catch (error) {
      console.error('Rest day submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to submit rest day');
    } finally {
      setLoading(false);
    }
  };

  // Access check
  if (!canSubmitWorkouts) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            You must be a player in this league to submit activities.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // If the league is completed, show a friendly, non-blocking note to the user
  // We still allow submissions but show a congratulatory banner.
  const CompletedBanner = () => (
    isLeagueCompleted ? (
      <div className="mb-4">
        <Alert>
          <Info className="size-4" />
          <AlertTitle>League Completed</AlertTitle>
          <AlertDescription>
            This league has completed — congrats on making it this far! You can still submit activities and we'll record them. Keep up the great work.
          </AlertDescription>
        </Alert>
      </div>
    ) : null
  );

  // Loading state for activities
  if (activitiesLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 lg:gap-6 lg:p-6">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading activities...</p>
      </div>
    );
  }

  // If the league is completed, block submissions and show a message
  if (isLeagueCompleted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 lg:gap-6 lg:p-6">
        <Alert>
          <Info className="size-4" />
          <AlertTitle>League Completed</AlertTitle>
          <AlertDescription>
            This league has finished — thanks for participating! Submissions are now closed.
            You can still view standings and past activity entries.
          </AlertDescription>
        </Alert>
        <div>
          <Button variant="outline" asChild>
            <Link href={`/leagues/${leagueId}`}>Back to League</Link>
          </Button>
        </div>
      </div>
    );
  }

  // No activities configured check
  if (activitiesErrorCode === 'NO_ACTIVITIES_CONFIGURED' || activityTypes.length === 0) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Activities Not Configured</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>This league does not have any activities configured yet.</p>
            <p className="text-sm">Please contact the league host to configure activities before submitting workouts.</p>
          </AlertDescription>
        </Alert>
        <Button variant="outline" asChild className="w-fit">
          <Link href={`/leagues/${leagueId}`}>Back to League</Link>
        </Button>
      </div>
    );
  }

  // Success Dialog Handler
  const handleSubmitAnother = () => {
    setSubmitted(false);
    setSubmittedData(null);
    setShowConfetti(false);
    setFormData({
      activity_type: '',
      duration: '',
      distance: '',
      steps: '',
      holes: '',
      notes: '',
    });
    setSelectedFile(null);
    setImagePreview(null);
    setRestDayReason('');
    setIsExemptionRequest(false);
    // Refresh rest day stats if on rest tab
    if (submissionType === 'rest') {
      fetchRestDayStats();
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submit Activity</h1>
          <p className="text-muted-foreground">
            Log your workout or rest day to earn points
            {activeLeague?.team_name && (
              <> - <span className="font-medium">{activeLeague.team_name}</span></>
            )}
          </p>
        </div>
      </div>

      <Tabs value={submissionType} onValueChange={(v) => setSubmissionType(v as 'workout' | 'rest')} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="workout" className="flex items-center gap-2">
            <Dumbbell className="size-4" />
            Workout
          </TabsTrigger>
          <TabsTrigger value="rest" className="flex items-center gap-2">
            <Moon className="size-4" />
            Rest Day
          </TabsTrigger>
        </TabsList>

        {/* Workout Tab Content */}
        <TabsContent value="workout" className="mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-lg border p-4 space-y-4 max-w-2xl">
              {/* Activity Type - Dropdown */}
              <div className="space-y-2">
                <Label htmlFor="activity-type">Activity Type *</Label>
                <Select
                  value={formData.activity_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, activity_type: value }))
                  }
                >
                  <SelectTrigger id="activity-type">
                    <SelectValue placeholder="Select an activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {activityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedActivity?.admin_info && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {selectedActivity.admin_info}
                  </div>
                )}
              </div>

              {/* Workout Metrics */}
              {formData.activity_type && (() => {
                const primary = selectedActivity?.measurement_type || 'duration';
                const secondary = selectedActivity?.settings?.secondary_measurement_type;

                const renderInput = (type: string) => {
                  let label = '';
                  let placeholder = '';
                  let unit = '';
                  const formKey = type === 'hole' ? 'holes' : type;

                  switch (type) {
                    case 'duration':
                      label = 'Duration';
                      placeholder = '45';
                      unit = 'minutes';
                      break;
                    case 'distance':
                      label = 'Distance';
                      placeholder = '5.2';
                      unit = 'km';
                      break;
                    case 'steps':
                      label = 'Steps';
                      placeholder = '5000';
                      unit = 'steps';
                      break;
                    case 'hole':
                      label = 'Holes';
                      placeholder = '9';
                      unit = 'holes';
                      break;
                  }

                  return (
                    <div key={type} className="space-y-2">
                      <Label htmlFor={type}>{label}</Label>
                      <div className="relative">
                        <Input
                          id={type}
                          type="number"
                          min="0"
                          step={type === 'distance' ? '0.01' : '1'}
                          placeholder={placeholder}
                          value={formData[formKey as keyof typeof formData]}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, [formKey]: e.target.value }))
                          }
                          className="pr-20 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [appearance:textfield]"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 border-l bg-muted/50 text-muted-foreground rounded-r-md px-3 text-sm">
                          {unit}
                        </div>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-4">
                    {secondary ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderInput(primary)}
                        {renderInput(secondary)}
                      </div>
                    ) : (
                      renderInput(primary)
                    )}
                    {secondary && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="size-3" />
                        Enter only one metric - {primary} OR {secondary}
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Date and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Activity Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {format(activityDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={activityDate}
                        onSelect={(date) => date && setActivityDate(date)}
                        disabled={(date) => {
                          if (date > new Date()) return true;
                          if (activeLeague?.end_date) {
                            const endString = String(activeLeague.end_date).slice(0, 10);
                            const dateYmd = format(date, 'yyyy-MM-dd');
                            return dateYmd > endString;
                          }
                          return false;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="How did it feel?"
                    rows={2}
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label htmlFor="proof-file">Proof Screenshot *</Label>
                <input
                  id="proof-file"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="Upload proof screenshot"
                />
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Selected workout"
                      className="w-full h-32 object-contain rounded-lg border bg-muted"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={removeImage}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={handleUploadClick}
                    className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    {uploadingImage || ocrProcessing ? (
                      <Loader2 className="size-6 mx-auto text-primary animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="size-6 mx-auto text-muted-foreground mb-1" />
                        <p className="text-sm text-muted-foreground">Click to upload image</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Summary and Submit */}
              <div className="pt-4 border-t space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estimated RR</span>
                  <span className="text-lg font-bold text-primary">
                    ~{estimatedRR.toFixed(1)} RR
                  </span>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || uploadingImage || !formData.activity_type || !selectedFile}
                >
                  {loading || uploadingImage ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {uploadingImage ? 'Uploading...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      Submit Activity
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Submission will be reviewed by your captain
                </p>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* Rest Day Tab Content */}
        <TabsContent value="rest" className="mt-6">
          <form onSubmit={handleRestDaySubmit} className="space-y-6">
            <div className="rounded-lg border p-4 space-y-4 max-w-2xl">
              {/* Rest Day Stats */}
              {restDayLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : restDayStats ? (
                <div className="space-y-3 pb-4 border-b">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rest Days</span>
                    <span className="font-medium">
                      {restDayStats.used} / {restDayStats.totalAllowed} used
                    </span>
                  </div>
                  <Progress
                    value={(restDayStats.used / restDayStats.totalAllowed) * 100}
                    className={cn(
                      'h-2',
                      restDayStats.isAtLimit && '[&>div]:bg-amber-500'
                    )}
                  />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-lg font-bold text-green-600">{restDayStats.remaining}</div>
                      <div className="text-xs text-muted-foreground">Remaining</div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-lg font-bold">{restDayStats.used}</div>
                      <div className="text-xs text-muted-foreground">Used</div>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <div className="text-lg font-bold text-amber-600">{restDayStats.pending}</div>
                      <div className="text-xs text-muted-foreground">Pending</div>
                    </div>
                  </div>
                  {restDayStats.isAtLimit && (
                    <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                      <ShieldAlert className="size-4 text-amber-600" />
                      <AlertTitle className="text-sm text-amber-800 dark:text-amber-400">Limit Reached</AlertTitle>
                      <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                        This will be an exemption request requiring approval.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ) : null}

              {/* Rest Day Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rest Day Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 size-4" />
                        {format(activityDate, 'MMM d, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={activityDate}
                        onSelect={(date) => date && setActivityDate(date)}
                        disabled={(date) => {
                          if (date > new Date()) return true;
                          if (activeLeague?.end_date) {
                            const endString = String(activeLeague.end_date).slice(0, 10);
                            const dateYmd = format(date, 'yyyy-MM-dd');
                            return dateYmd > endString;
                          }
                          return false;
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="restReason">
                    {restDayStats?.isAtLimit ? 'Reason for Exemption *' : 'Reason (Optional)'}
                  </Label>
                  <Textarea
                    id="restReason"
                    placeholder={
                      restDayStats?.isAtLimit
                        ? 'Please explain why you need an additional rest day...'
                        : 'E.g., Recovery day, feeling unwell, etc.'
                    }
                    value={restDayReason}
                    onChange={(e) => setRestDayReason(e.target.value)}
                    rows={3}
                    required={restDayStats?.isAtLimit}
                  />
                </div>

                {/* Summary and Submit */}
                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">RR Points</span>
                    <span className="text-lg font-bold text-primary">+1.0 RR</span>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || (restDayStats?.isAtLimit && !restDayReason.trim())}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Submitting...
                      </>
                    ) : restDayStats?.isAtLimit ? (
                      <>
                        Request Exemption
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    ) : (
                      <>
                        Log Rest Day
                        <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    {restDayStats?.isAtLimit
                      ? 'Requires approval from Captain or Governor'
                      : 'Rest days earn 1.0 RR when approved'}
                  </p>
                </div>
              </div>
            </div>
          </form>
        </TabsContent>
      </Tabs>

      {/* OCR Success Dialog */}
      <AlertDialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="size-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-6 text-green-600" />
            </div>
            <AlertDialogTitle className="text-center">Duration Detected!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              We extracted the workout duration from your screenshot
            </AlertDialogDescription>
          </AlertDialogHeader>
          {ocrResult && (
            <div className="text-center py-4">
              <div className="text-sm text-muted-foreground mb-2">Time found:</div>
              <div className="text-2xl font-bold text-primary mb-1">{ocrResult.raw}</div>
              <div className="text-sm text-muted-foreground">
                Converted to <span className="font-semibold text-foreground">{ocrResult.minutes} minutes</span>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogAction>Got it!</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Overwrite Confirmation Dialog */}
      <AlertDialog open={overwriteDialogOpen} onOpenChange={setOverwriteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Overwrite Existing Entry?</AlertDialogTitle>
            <AlertDialogDescription asChild className="space-y-4 pt-2 text-left">
              <div>
                <p>
                  You have already submitted an activity for <strong>{format(activityDate, 'MMMM d, yyyy')}</strong>.
                </p>

                {existingEntry && (
                  <div className="rounded-md bg-muted p-3 text-sm">
                    <div className="font-semibold mb-2">Existing Entry Details:</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground block text-xs">Activity Type</span>
                        <span className="font-medium capitalize">
                          {existingEntry.type === 'workout'
                            ? (existingEntry.workout_type?.replace(/_/g, ' ') || 'Workout')
                            : 'Rest Day'}
                        </span>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-muted-foreground block text-xs">Status</span>
                        <span className={cn(
                          "capitalize font-medium",
                          existingEntry.status === 'approved' ? "text-green-600 dark:text-green-400" :
                            existingEntry.status === 'rejected' ? "text-red-600 dark:text-red-400" :
                              "text-yellow-600 dark:text-yellow-400"
                        )}>
                          {existingEntry.status}
                        </span>
                      </div>

                      {(existingEntry.duration !== null && existingEntry.duration !== undefined) && (
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-muted-foreground block text-xs">Duration</span>
                          <span>{existingEntry.duration} mins</span>
                        </div>
                      )}
                      {(existingEntry.distance !== null && existingEntry.distance !== undefined) && (
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-muted-foreground block text-xs">Distance</span>
                          <span>{existingEntry.distance} km</span>
                        </div>
                      )}
                      {(existingEntry.steps !== null && existingEntry.steps !== undefined) && (
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-muted-foreground block text-xs">Steps</span>
                          <span>{existingEntry.steps}</span>
                        </div>
                      )}
                      {(existingEntry.holes !== null && existingEntry.holes !== undefined) && (
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-muted-foreground block text-xs">Holes</span>
                          <span>{existingEntry.holes}</span>
                        </div>
                      )}
                      {(existingEntry.rr_value !== null && existingEntry.rr_value !== undefined) && (
                        <div className="col-span-2 sm:col-span-1">
                          <span className="text-muted-foreground block text-xs">RR Value</span>
                          <span>{Number(existingEntry.rr_value).toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {existingEntry.proof_url && (
                      <div className="mt-3 pt-3 border-t">
                        <span className="text-muted-foreground block text-xs mb-1">Proof</span>
                        <button
                          type="button"
                          onClick={() => setViewProofUrl(existingEntry.proof_url)}
                          className="text-primary hover:underline flex items-center gap-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-sm"
                        >
                          <ImageIcon className="size-4" />
                          View Uploaded Image
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <p>
                  Submitting this new entry will <strong>overwrite</strong> the existing one permanently.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <div className="flex w-full sm:justify-end gap-2">
              <Button variant="outline" onClick={() => setOverwriteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setOverwriteDialogOpen(false);
                  handleSubmissionFlow(true); // Retry with overwrite=true
                }}
              >
                Overwrite & Submit
              </Button>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog with Confetti */}
      {
        showConfetti && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={500}
            gravity={0.2}
            colors={['#22c55e', '#10b981', '#14b8a6', '#6366f1', '#8b5cf6', '#f59e0b']}
          />
        )
      }

      <Dialog open={submitted} onOpenChange={(open) => !open && handleSubmitAnother()}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4">
              <div className={cn(
                "size-20 rounded-full flex items-center justify-center animate-bounce",
                submittedData?.isExemption
                  ? "bg-gradient-to-br from-amber-400 to-orange-600"
                  : submittedData?.isRestDay
                    ? "bg-gradient-to-br from-blue-400 to-indigo-600"
                    : "bg-gradient-to-br from-green-400 to-emerald-600"
              )}>
                {submittedData?.isRestDay ? (
                  <Moon className="size-10 text-white" />
                ) : (
                  <PartyPopper className="size-10 text-white" />
                )}
              </div>
            </div>
            <DialogTitle className="text-2xl">
              {submittedData?.isExemption
                ? 'Exemption Request Submitted!'
                : submittedData?.isRestDay
                  ? 'Rest Day Logged!'
                  : 'Activity Submitted!'}
            </DialogTitle>
            <DialogDescription className="text-base">
              {submittedData?.isExemption
                ? 'Your rest day exemption request has been submitted and is awaiting approval from your Captain or Governor.'
                : submittedData?.isRestDay
                  ? 'Your rest day has been logged and is pending validation.'
                  : 'Your workout has been submitted and is pending validation by your team captain.'}
            </DialogDescription>
          </DialogHeader>

          {(submittedData?.rr_value || submittedData?.isRestDay) && (
            <div className="flex justify-center py-2">
              <div className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-full border",
                submittedData?.isExemption
                  ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20"
                  : "bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20"
              )}>
                <span className={cn(
                  "text-2xl font-bold",
                  submittedData?.isExemption ? "text-amber-600" : "text-green-600"
                )}>
                  +{submittedData?.rr_value?.toFixed(1) || '1.0'}
                </span>
                <span className="text-sm text-muted-foreground">
                  RR points {submittedData?.isExemption && '(if approved)'}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center pt-2">
            <Button variant="outline" onClick={handleSubmitAnother} className="flex-1">
              <RotateCcw className="mr-2 size-4" />
              Submit Another
            </Button>
            <Button asChild className="flex-1">
              <Link href={`/leagues/${leagueId}/my-submissions`}>
                <Eye className="mr-2 size-4" />
                View Submissions
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!viewProofUrl} onOpenChange={(open) => !open && setViewProofUrl(null)}>
        <DialogContent className="max-w-3xl w-full p-0 overflow-hidden bg-transparent border-none shadow-none" showCloseButton={false}>
          <DialogTitle className="sr-only">Proof Image Preview</DialogTitle>
          <div className="relative w-full h-auto max-h-[85vh] flex items-center justify-center bg-black/50 rounded-lg overflow-hidden backdrop-blur-sm">
            <button
              onClick={() => setViewProofUrl(null)}
              className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 rounded-full text-white transition-colors z-10 shadow-sm"
              aria-label="Close preview"
            >
              <X className="size-5" />
            </button>
            {viewProofUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewProofUrl}
                alt="Proof Preview"
                className="max-w-full max-h-[80vh] object-contain rounded-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
