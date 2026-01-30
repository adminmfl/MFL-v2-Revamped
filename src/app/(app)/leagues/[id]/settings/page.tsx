'use client';

import React, { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  Globe,
  Lock,
  Users,
  Trophy,
  Info,
  Shield,
  Calendar,
  Activity,
} from 'lucide-react';

import { useRole } from '@/contexts/role-context';
import { useLeague } from '@/contexts/league-context';
import { useLeagueActivities } from '@/hooks/use-league-activities';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

// ============================================================================
// League Settings Page (Host Only)
// ============================================================================

function FieldInfoButton({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-5 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-muted-foreground/60"
          aria-label="Field information"
        >
          <Info className="size-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export default function LeagueSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { isHost } = useRole();
  const { activeLeague, refetch } = useLeague();
  const { data: activitiesData, isLoading: activitiesLoading } = useLeagueActivities(id, {
    includeAll: true,
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoDeleting, setLogoDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    league_name: activeLeague?.name || '',
    description: activeLeague?.description || '',
    is_public: false,
    is_exclusive: true,
    num_teams: '4',
    rest_days: '1',
    auto_rest_day_enabled: false,
    start_date: '',
    end_date: '',
    status: 'draft' as 'draft' | 'launched' | 'active' | 'completed',
    normalize_points_by_team_size: false,
  });

  const canEditStructure = formData.status === 'draft';

  const handleLogoUpload = async (file: File) => {
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);

      const res = await fetch(`/api/leagues/${id}/logo`, {
        method: 'POST',
        body: form,
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Upload failed');
      }

      setLogoUrl(json.data?.url || null);
      toast.success('League logo updated');
      await refetch();
    } catch (error) {
      console.error('[League Settings] logo upload', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleLogoUpload(file);
      e.target.value = '';
    }
  };

  const handleLogoDelete = async () => {
    setLogoDeleting(true);
    try {
      const res = await fetch(`/api/leagues/${id}/logo`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'Delete failed');
      }
      setLogoUrl(null);
      toast.success('League logo removed');
      await refetch();
    } catch (error) {
      console.error('[League Settings] logo delete', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete logo');
    } finally {
      setLogoDeleting(false);
    }
  };

  useEffect(() => {
    const loadLeague = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const res = await fetch(`/api/leagues/${id}`);
        if (!res.ok) {
          throw new Error('Failed to load league');
        }

        const json = await res.json();
        const league = json.data;

        setFormData({
          league_name: league.league_name || '',
          description: league.description || '',
          is_public: !!league.is_public,
          is_exclusive: !!league.is_exclusive,
          num_teams: String(league.num_teams || '4'),
          rest_days: String(league.rest_days ?? '1'),
          auto_rest_day_enabled: !!league.auto_rest_day_enabled,
          start_date: league.start_date,
          end_date: league.end_date,
          status: league.status,
          normalize_points_by_team_size: !!league.normalize_points_by_team_size,
        });
        setLogoUrl(league.logo_url || null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load league');
      } finally {
        setLoading(false);
      }
    };

    loadLeague();
  }, [id]);

  // Access check
  if (!isHost) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Shield className="size-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Access Restricted</h2>
              <p className="text-muted-foreground mb-4">
                Only the league host can access settings.
              </p>
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center space-y-3">
              <Loader2 className="size-10 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Loading league settings...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-6 py-4 md:py-6">
        <div className="px-4 lg:px-6">
          <Card className="max-w-lg mx-auto">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertTriangle className="size-10 text-destructive mx-auto" />
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Unable to load league</h2>
                <p className="text-muted-foreground">{loadError}</p>
              </div>
              <Button variant="outline" onClick={() => router.refresh()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      const payload: Record<string, string | number | boolean> = {
        rest_days: Number(formData.rest_days),
        auto_rest_day_enabled: formData.auto_rest_day_enabled,
        description: formData.description,
        normalize_points_by_team_size: formData.normalize_points_by_team_size,
      };

      if (canEditStructure) {
        Object.assign(payload, {
          league_name: formData.league_name,
          is_public: formData.is_public,
          is_exclusive: formData.is_exclusive,
          num_teams: Number(formData.num_teams),
          start_date: formData.start_date,
          end_date: formData.end_date,
        });
      }

      const res = await fetch(`/api/leagues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to save changes');
      }

      const json = await res.json();
      if (json?.data) {
        const league = json.data;
        setFormData((prev) => ({
          ...prev,
          league_name: league.league_name || prev.league_name,
          description: league.description || '',
          is_public: !!league.is_public,
          is_exclusive: !!league.is_exclusive,
          num_teams: String(league.num_teams || prev.num_teams),
          rest_days: String(league.rest_days ?? prev.rest_days),
          auto_rest_day_enabled: !!league.auto_rest_day_enabled,
          start_date: league.start_date,
          end_date: league.end_date,
          status: league.status,
        }));
      }

      await refetch();

      // Show specific toast for each setting changed
      const messages: string[] = [];

      if (payload.auto_rest_day_enabled !== undefined) {
        const status = payload.auto_rest_day_enabled ? 'enabled' : 'disabled';
        messages.push(`Auto rest day ${status}`);
      }

      if (payload.normalize_points_by_team_size !== undefined) {
        const status = payload.normalize_points_by_team_size ? 'enabled' : 'disabled';
        messages.push(`Point normalization ${status}`);
      }

      if (messages.length > 0) {
        toast.success(messages.join('. ') + '.');
      } else {
        toast.success('League settings updated.');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leagues/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'Failed to delete league');
      }

      await refetch();
      router.push('/dashboard');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete league');
    } finally {
      setDeleting(false);
    }
  };

  // Note: totalMembers calculation removed - capacity now comes from tier

  return (
    <div className="flex flex-col gap-6 py-4 md:py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Settings className="size-6 text-primary" />
              League Settings
            </h1>
            <p className="text-muted-foreground">
              Configure your league settings and preferences
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="outline" className="w-fit">
              League ID: {id.slice(0, 8)}...
            </Badge>
            <Badge variant={formData.status === 'active' ? 'default' : 'secondary'} className="capitalize">
              {formData.status}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Calendar className="size-3" />
              {formData.start_date || '—'} → {formData.end_date || '—'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 lg:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="size-5 text-primary" />
                  Basic Information
                  <FieldInfoButton text="Update core league details and schedule." />
                </CardTitle>
                <CardDescription>
                  Update your league details and description
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="league_name">League Name</Label>
                  <Input
                    id="league_name"
                    value={formData.league_name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        league_name: e.target.value,
                      }))
                    }
                    placeholder="Enter league name"
                    disabled={!canEditStructure}
                    className="bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Describe your league goals and rules..."
                    className="bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                      }
                      disabled={!canEditStructure}
                      className="bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, end_date: e.target.value }))
                      }
                      disabled={!canEditStructure}
                      className="bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Button
                    asChild
                    size="sm"
                    className="gap-2 border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 dark:border-primary/30 dark:bg-primary/15 dark:text-primary-foreground/90"
                  >
                    <Link href={`/leagues/${id}/team`}>
                      <Users className="size-4" />
                      Team Management
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="gap-2 border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 dark:border-accent/40 dark:bg-accent/15 dark:text-accent-foreground"
                  >
                    <Link href={`/leagues/${id}/activities`}>
                      <Activity className="size-4" />
                      Configure Activities
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Branding / Logo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="size-5 text-primary" />
                  League Branding
                  <FieldInfoButton text="Upload a square logo shown on league pages and invites." />
                </CardTitle>
                <CardDescription>
                  Upload a square logo (PNG/JPEG/WebP, max 2MB)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-xl border bg-muted overflow-hidden flex items-center justify-center">
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoUrl} alt="League logo" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm text-muted-foreground">No logo</span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Recommended: 512×512px. Transparent PNG or WebP looks best.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading}
                      >
                        {logoUploading ? (
                          <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 size-4" />
                            Upload Logo
                          </>
                        )}
                      </Button>
                      {logoUrl && (
                        <Button
                          variant="secondary"
                          onClick={handleLogoDelete}
                          disabled={logoDeleting}
                        >
                          {logoDeleting ? (
                            <>
                              <Loader2 className="mr-2 size-4 animate-spin" />
                              Removing...
                            </>
                          ) : (
                            <>
                              <Trash2 className="mr-2 size-4" />
                              Remove Logo
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoFileChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="size-5 text-primary" />
                  Team Configuration
                  <FieldInfoButton text="Adjust team count and rest day rules." />
                </CardTitle>
                <CardDescription>
                  Configure team settings (changes may not apply to active
                  leagues)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Teams</Label>
                    <Select
                      value={formData.num_teams}
                      onValueChange={(v) =>
                        setFormData((prev) => ({ ...prev, num_teams: v }))
                      }
                      disabled={!canEditStructure}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((n) => (
                          <SelectItem key={n} value={n.toString()}>
                            {n} teams
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rest_days">Total Rest Days</Label>
                    <Input
                      id="rest_days"
                      type="number"
                      min="0"
                      value={formData.rest_days}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, rest_days: e.target.value }))
                      }
                      placeholder="e.g. 18"
                      className="bg-black/10 border-2 border-muted-foreground/20 shadow-sm text-foreground"
                    />
                  </div>
                </div>

                <div className="mt-4 p-3 rounded-lg bg-muted">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm text-muted-foreground">
                      Capacity is determined by your league tier.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Rest day changes apply immediately, even for active leagues.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rest Day Automation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="size-5 text-primary" />
                  Rest Day Automation
                  <FieldInfoButton text="Automatically apply rest days when members miss deadlines." />
                </CardTitle>
                <CardDescription>
                  Auto-assign a rest day if a member misses the daily deadline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/60">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">Auto Rest Day</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, the cron job assigns a rest day for members with remaining rest days and no submission for the previous day.
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">💾 Click "Save Changes" to apply</p>
                  </div>
                  <Switch
                    checked={formData.auto_rest_day_enabled}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, auto_rest_day_enabled: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Point Normalization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="size-5 text-primary" />
                  Point Normalization
                  <FieldInfoButton text="Normalize points to account for team size differences." />
                </CardTitle>
                <CardDescription>
                  Normalize team points based on team size for fair competition
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/60">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">Normalize Points by Team Size</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, team points are normalized using the formula: (raw_points / team_size) × max_team_size
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">💾 Click "Save Changes" to apply</p>
                  </div>
                  <Switch
                    checked={formData.normalize_points_by_team_size}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, normalize_points_by_team_size: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Visibility Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Visibility & Access
                  <FieldInfoButton text="Control discoverability and invite-only access." />
                </CardTitle>
                <CardDescription>
                  Control who can see and join your league
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/60">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Globe className="size-4 text-muted-foreground" />
                      Public League
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Allow anyone to discover this league
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">💾 Click "Save Changes" to apply</p>
                  </div>
                  <Switch
                    checked={formData.is_public}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_public: checked }))
                    }
                    disabled={!canEditStructure}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/60">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Lock className="size-4 text-muted-foreground" />
                      Invite Only
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Require invite code to join
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">💾 Click "Save Changes" to apply</p>
                  </div>
                  <Switch
                    checked={formData.is_exclusive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, is_exclusive: checked }))
                    }
                    disabled={!canEditStructure}
                  />
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column - Summary Sidebar */}
          <div className="space-y-6">
            {/* Teams Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="size-4 text-primary" />
                  Teams Summary
                  <FieldInfoButton text="Quick overview of team configuration." />
                </CardTitle>
                <CardDescription>Configured team settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Teams</span>
                  <span className="font-medium tabular-nums">{formData.num_teams}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rest Days</span>
                  <span className="font-medium tabular-nums">{formData.rest_days}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto Rest Day</span>
                  <span className="font-medium">{formData.auto_rest_day_enabled ? 'On' : 'Off'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Point Normalization</span>
                  <span className="font-medium">{formData.normalize_points_by_team_size ? 'On' : 'Off'}</span>
                </div>
              </CardContent>
            </Card>

            {/* Activities Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  Activities Summary
                  <FieldInfoButton text="Summary of enabled activities and limits." />
                </CardTitle>
                <CardDescription>Enabled activity configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enabled</span>
                  <span className="font-medium tabular-nums">
                    {activitiesLoading ? '—' : activitiesData?.activities.length ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Available</span>
                  <span className="font-medium tabular-nums">
                    {activitiesLoading ? '—' : activitiesData?.allActivities?.length ?? activitiesData?.activities.length ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Weekly Limits</span>
                  <span className="font-medium">
                    {activitiesLoading
                      ? '—'
                      : activitiesData?.supportsFrequency === false
                        ? 'Off'
                        : 'On'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Danger Zone Card */}
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <AlertTriangle className="size-5" />
                  Danger Zone
                  <FieldInfoButton text="Irreversible actions for this league." />
                </CardTitle>
                <CardDescription>
                  Irreversible actions. Proceed with caution.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <Trash2 className="mr-2 size-4" />
                      Delete League
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently
                        delete the league and remove all associated data
                        including teams, members, and submissions.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          'Delete League'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Summary Card */}
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Settings Summary
                  <FieldInfoButton text="Review current settings before saving." />
                </CardTitle>
                <CardDescription>Review your changes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">League Name</span>
                    <span className="font-medium truncate max-w-[150px]">
                      {formData.league_name || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium capitalize">{formData.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Schedule</span>
                    <span className="font-medium text-right">
                      {formData.start_date || '—'} → {formData.end_date || '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teams</span>
                    <span className="font-medium">{formData.num_teams}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Rest Days</span>
                    <span className="font-medium">{formData.rest_days}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto Rest Day</span>
                    <span className="font-medium">{formData.auto_rest_day_enabled ? 'On' : 'Off'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Point Normalization</span>
                    <span className="font-medium">{formData.normalize_points_by_team_size ? 'On' : 'Off'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Capacity</span>
                    <span className="font-medium text-xs">(from tier)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visibility</span>
                    <span className="font-medium">
                      {formData.is_public ? 'Public' : 'Private'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Join Type</span>
                    <span className="font-medium">
                      {formData.is_exclusive ? 'Invite Only' : 'Open'}
                    </span>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 size-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                  {saveError && (
                    <p className="text-sm text-destructive mt-2">{saveError}</p>
                  )}
                </div>

                {/* Info */}
                <div className="pt-4 border-t">
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <Info className="size-4 shrink-0 mt-0.5" />
                    <p>
                      Some settings may not take effect immediately for active
                      leagues.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
