'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import Tesseract from 'tesseract.js';
import {
  Dumbbell,
  Upload,
  Calendar as CalendarIcon,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Image as ImageIcon,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ============================================================================
// Submit Activity Page
// ============================================================================

const activityTypes = [
  { value: 'strength', label: 'Strength Training', points: 10 },
  { value: 'cardio', label: 'Cardio', points: 8 },
  { value: 'yoga', label: 'Yoga/Stretching', points: 6 },
  { value: 'sports', label: 'Sports', points: 10 },
  { value: 'walking', label: 'Walking', points: 5 },
  { value: 'hiit', label: 'HIIT', points: 12 },
  { value: 'swimming', label: 'Swimming', points: 10 },
  { value: 'cycling', label: 'Cycling', points: 8 },
];

export default function SubmitActivityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();

  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [activityDate, setActivityDate] = React.useState<Date>(new Date());
  const [formData, setFormData] = React.useState({
    activity_type: '',
    duration: '',
    notes: '',
  });

  // OCR state
  const [ocrProcessing, setOcrProcessing] = React.useState(false);
  const [uploadedImage, setUploadedImage] = React.useState<string | null>(null);
  const [ocrDialogOpen, setOcrDialogOpen] = React.useState(false);
  const [ocrResult, setOcrResult] = React.useState<{ raw: string; minutes: number } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const selectedActivity = activityTypes.find(
    (a) => a.value === formData.activity_type
  );

  const estimatedPoints = React.useMemo(() => {
    if (!selectedActivity || !formData.duration) return 0;
    const durationMultiplier = Math.min(parseInt(formData.duration) / 30, 2);
    return Math.round(selectedActivity.points * durationMultiplier);
  }, [selectedActivity, formData.duration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSubmitted(true);
    setLoading(false);
  };

  // Parse workout time from OCR text
  const parseWorkoutTime = (text: string): { raw: string; minutes: number } | null => {
    // Look for time pattern like "1:16:51" (H:MM:SS) or "76:51" (MM:SS)
    const timePattern = /(\d{1,2}):(\d{2}):(\d{2})/;
    const match = text.match(timePattern);

    if (match) {
      const hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const seconds = parseInt(match[3]);

      // Convert to total minutes
      const totalMinutes = hours * 60 + minutes + Math.round(seconds / 60);

      return {
        raw: `${match[1]}:${match[2]}:${match[3]}`,
        minutes: totalMinutes,
      };
    }

    return null;
  };

  // Handle file upload and OCR processing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create image preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process OCR
    setOcrProcessing(true);

    try {
      const result = await Tesseract.recognize(file, 'eng', {
        logger: (m) => console.log(m),
      });

      const extractedText = result.data.text;
      console.log('Extracted text:', extractedText);

      const workoutTime = parseWorkoutTime(extractedText);

      if (workoutTime) {
        setOcrResult(workoutTime);
        setFormData((prev) => ({ ...prev, duration: workoutTime.minutes.toString() }));
        setOcrDialogOpen(true);
      } else {
        alert('Could not extract workout time from image. Please enter manually.');
      }
    } catch (error) {
      console.error('OCR error:', error);
      alert('Failed to process image. Please try again or enter manually.');
    } finally {
      setOcrProcessing(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Success State
  if (submitted) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
        <div className="max-w-lg mx-auto w-full">
          <div className="rounded-lg border bg-card text-card-foreground">
            <div className="p-6 text-center">
              <div className="size-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <CheckCircle2 className="size-8 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold mb-1">Activity Submitted!</h2>
              <p className="text-muted-foreground mb-4">
                Your activity has been submitted and is pending validation.
              </p>

              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-medium mb-6">
                +{estimatedPoints} points (estimated)
              </div>

              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => setSubmitted(false)}>
                  Submit Another
                </Button>
                <Button onClick={() => router.push(`/leagues/${id}`)}>
                  Back to League
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Submit Activity</h1>
          <p className="text-muted-foreground">
            Log your workout to earn points for your team
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/leagues/${id}`}>Cancel</Link>
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Activity Type */}
            <div className="rounded-lg border">
              <div className="border-b bg-muted/50 px-4 py-3">
                <h2 className="font-semibold">Activity Type</h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {activityTypes.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          activity_type: type.value,
                        }))
                      }
                      className={cn(
                        'p-3 rounded-lg border text-center transition-all hover:border-primary/50',
                        formData.activity_type === type.value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border bg-background'
                      )}
                    >
                      <span className="text-sm font-medium block">
                        {type.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        +{type.points} base pts
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Details */}
            <div className="rounded-lg border">
              <div className="border-b bg-muted/50 px-4 py-3">
                <h2 className="font-semibold">Activity Details</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      max="300"
                      placeholder="e.g., 45"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          duration: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Activity Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 size-4" />
                          {format(activityDate, 'PPP')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={activityDate}
                          onSelect={(date) => date && setActivityDate(date)}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any details about your workout..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="rounded-lg border">
              <div className="border-b bg-muted/50 px-4 py-3">
                <h2 className="font-semibold">Upload Workout Screenshot</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-extract duration from Apple Watch or fitness app screenshots
                </p>
              </div>
              <div className="p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {uploadedImage ? (
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="Uploaded workout"
                      className="w-full h-48 object-contain rounded-lg border bg-muted"
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
                    className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    {ocrProcessing ? (
                      <>
                        <Loader2 className="size-8 mx-auto text-primary mb-2 animate-spin" />
                        <p className="text-sm font-medium mb-1">Processing image...</p>
                        <p className="text-xs text-muted-foreground">
                          Extracting workout data
                        </p>
                      </>
                    ) : (
                      <>
                        <ImageIcon className="size-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm font-medium mb-1">
                          Upload workout screenshot
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG - We'll auto-extract the duration
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="rounded-lg border sticky top-6">
              <div className="border-b bg-muted/50 px-4 py-3">
                <h2 className="font-semibold">Summary</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Activity</span>
                    <span className="font-medium">
                      {selectedActivity?.label || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">
                      {formData.duration ? `${formData.duration} min` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {format(activityDate, 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>

                <Separator />

                {/* Points Estimate */}
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Estimated Points
                    </span>
                    <span className="text-xl font-bold text-primary">
                      +{estimatedPoints}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Final points may vary based on validation
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !formData.activity_type || !formData.duration}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Activity
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground">
                  Your submission will be reviewed by your team captain before
                  points are awarded.
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* OCR Success Dialog */}
      <AlertDialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <div className="size-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="size-6 text-green-600" />
            </div>
            <AlertDialogTitle className="text-center">OCR Successful!</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Extracted workout duration from your screenshot
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
    </div>
  );
}
