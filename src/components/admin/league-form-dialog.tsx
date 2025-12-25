"use client";

import * as React from "react";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AdminLeague, LeagueStatus } from "@/types/admin";
import { getTeamSizeStats, hasTeamSizeVariance, formatNormalizationMessage } from "@/lib/utils/normalization";

// ============================================================================
// Types
// ============================================================================

interface LeagueFormData {
  league_name: string;
  description: string;
  start_date: string;
  end_date: string;
  num_teams: number;
  team_size: number;
  rest_days: number;
  auto_rest_day_enabled: boolean;
  normalize_points_by_team_size: boolean;
  is_public: boolean;
  is_exclusive: boolean;
  status: LeagueStatus;
  is_active: boolean;
}

interface LeagueFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  league?: AdminLeague | null;
  onSubmit: (data: LeagueFormData) => void | Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const STATUSES: { value: LeagueStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "launched", label: "Launched" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
];

// ============================================================================
// LeagueFormDialog Component
// ============================================================================

export function LeagueFormDialog({
  open,
  onOpenChange,
  league,
  onSubmit,
}: LeagueFormDialogProps) {
  const isEditing = !!league;
  const [isLoading, setIsLoading] = React.useState(false);
  const [leagueTeams, setLeagueTeams] = React.useState<Array<{ team_id: string; team_name: string; member_count: number }>>([]);
  const [isLoadingTeams, setIsLoadingTeams] = React.useState(false);

  // Form state
  const [formData, setFormData] = React.useState<LeagueFormData>({
    league_name: "",
    description: "",
    start_date: "",
    end_date: "",
    num_teams: 4,
    team_size: 5,
    rest_days: 1,
    auto_rest_day_enabled: false,
    normalize_points_by_team_size: false,
    is_public: false,
    is_exclusive: true,
    status: "draft",
    is_active: true,
  });

  // Reset form when dialog opens/closes or league changes
  React.useEffect(() => {
    if (open && league) {
      setFormData({
        league_name: league.league_name,
        description: league.description || "",
        start_date: league.start_date,
        end_date: league.end_date,
        num_teams: league.num_teams,
        team_size: league.team_size,
        rest_days: league.rest_days,
        auto_rest_day_enabled: league.auto_rest_day_enabled,
        normalize_points_by_team_size: league.normalize_points_by_team_size,
        is_public: league.is_public,
        is_exclusive: league.is_exclusive,
        status: league.status,
        is_active: league.is_active,
      });
      // Fetch teams for this league
      fetchLeagueTeams(league.league_id);
    } else if (open && !league) {
      setFormData({
        league_name: "",
        description: "",
        start_date: "",
        end_date: "",
        num_teams: 4,
        team_size: 5,
        rest_days: 1,
        auto_rest_day_enabled: false,
        normalize_points_by_team_size: false,
        is_public: false,
        is_exclusive: true,
        status: "draft",
        is_active: true,
      });
      setLeagueTeams([]);
    }
  }, [open, league]);

  // Fetch teams for the league
  const fetchLeagueTeams = async (leagueId: string) => {
    setIsLoadingTeams(true);
    try {
      const response = await fetch(`/api/leagues/${leagueId}/teams`);
      if (response.ok) {
        const result = await response.json();
        setLeagueTeams(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching league teams:', error);
      setLeagueTeams([]);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  // Check if teams have different sizes
  const teamSizeStats = React.useMemo(() => {
    if (leagueTeams.length === 0) return null;
    return getTeamSizeStats(
      leagueTeams.map(t => ({
        teamId: t.team_id,
        teamName: t.team_name,
        memberCount: t.member_count,
      }))
    );
  }, [leagueTeams]);

  const canEnableNormalization = teamSizeStats && teamSizeStats.hasVariance && leagueTeams.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onSubmit(formData);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit League" : "Create New League"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the league details below."
              : "Fill in the details to create a new league."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* League Name */}
          <div className="space-y-2">
            <Label htmlFor="league_name">League Name *</Label>
            <Input
              id="league_name"
              placeholder="Summer Fitness Challenge"
              value={formData.league_name}
              onChange={(e) => setFormData({ ...formData, league_name: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your league..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Team Configuration */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="num_teams">Number of Teams</Label>
              <Input
                id="num_teams"
                type="number"
                min={2}
                max={20}
                value={formData.num_teams}
                onChange={(e) =>
                  setFormData({ ...formData, num_teams: parseInt(e.target.value) || 4 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team_size">Team Size</Label>
              <Input
                id="team_size"
                type="number"
                min={1}
                max={50}
                value={formData.team_size}
                onChange={(e) =>
                  setFormData({ ...formData, team_size: parseInt(e.target.value) || 5 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rest_days">Rest Days</Label>
              <Input
                id="rest_days"
                type="number"
                min={0}
                max={7}
                value={formData.rest_days}
                onChange={(e) =>
                  setFormData({ ...formData, rest_days: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          {/* Status (only for editing) */}
          {isEditing && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: LeagueStatus) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Visibility Settings */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_public">Public League</Label>
                <p className="text-sm text-muted-foreground">
                  Anyone can find and join this league
                </p>
              </div>
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_exclusive">Exclusive Entry</Label>
                <p className="text-sm text-muted-foreground">
                  Users need an invite code to join
                </p>
              </div>
              <Switch
                id="is_exclusive"
                checked={formData.is_exclusive}
                onCheckedChange={(checked) => setFormData({ ...formData, is_exclusive: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto_rest_day_enabled">Auto Rest Day Assignment</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically mark missing submissions as rest days (via cron)
                </p>
              </div>
              <Switch
                id="auto_rest_day_enabled"
                checked={formData.auto_rest_day_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, auto_rest_day_enabled: checked })}
              />
            </div>

            {isEditing && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active Status</Label>
                  <p className="text-sm text-muted-foreground">
                    League is visible and accessible
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            )}

            {isEditing && (
              <div className="border-t pt-4">
                {isLoadingTeams ? (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Normalize Points by Team Size</Label>
                      <p className="text-sm text-muted-foreground">Loading team data...</p>
                    </div>
                    <Switch disabled />
                  </div>
                ) : !canEnableNormalization ? (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="space-y-0.5">
                        <Label htmlFor="normalize_points">Normalize Points by Team Size</Label>
                        <p className="text-sm text-muted-foreground">
                          Only available when teams have different member counts
                        </p>
                      </div>
                      <Switch id="normalize_points" disabled checked={false} />
                    </div>
                    {leagueTeams.length > 0 && teamSizeStats && (
                      <Alert className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {formatNormalizationMessage(teamSizeStats)} - All teams are equal, normalization not needed.
                        </AlertDescription>
                      </Alert>
                    )}
                    {leagueTeams.length === 0 && (
                      <Alert className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No teams in this league yet. Add teams first to enable point normalization.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="normalize_points">Normalize Points by Team Size</Label>
                        <p className="text-sm text-muted-foreground">
                          Adjust points based on team member differences
                        </p>
                      </div>
                      <Switch
                        id="normalize_points"
                        checked={formData.normalize_points_by_team_size}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, normalize_points_by_team_size: checked })
                        }
                      />
                    </div>
                    {teamSizeStats && (
                      <Alert className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {formatNormalizationMessage(teamSizeStats)} - Normalization is available for fair scoring.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {isEditing ? "Updating..." : "Creating..."}
                </>
              ) : isEditing ? (
                "Update League"
              ) : (
                "Create League"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default LeagueFormDialog;
