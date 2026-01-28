'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Helper to get unit label from measurement type
function getUnitLabel(measurementType: string): string {
  const unitMap: Record<string, string> = {
    duration: 'minutes',
    distance: 'km',
    steps: 'steps',
    hole: 'holes',
  };
  return unitMap[measurementType?.toLowerCase()] || measurementType;
}

// Default values for each measurement type
function getDefaultValues(measurementType: string): { min: number; max: number } {
  const defaults: Record<string, { min: number; max: number }> = {
    duration: { min: 45, max: 90 },
    distance: { min: 4, max: 8 },
    steps: { min: 10000, max: 20000 },
    hole: { min: 9, max: 18 },
  };
  return defaults[measurementType?.toLowerCase()] || { min: 50, max: 100 };
}

interface AgeOverride {
  id: string;
  ageMin: number | null;
  ageMax: number | null;
  minValue: number | null;
  maxValue: number | null;
}

interface ActivityMinimumProps {
  leagueId: string;
  activityId: string;
  symbol: string;
  measurementType: string;
  frequency?: number | null;
  supportsFrequency?: boolean;
  initialConfig?: {
    min_value: number | null;
    max_value: number | null;
    age_group_overrides: Record<string, any>;
  };
  onMinimumChange?: (config: {
    activity_id: string;
    min_value: number | null;
    age_group_overrides: Record<string, any>;
  }) => void;
  onFrequencyChange?: (activityId: string, frequency: string) => void;
  onFrequencyBlur?: (activityId: string) => void;
}

export function ActivityMinimumDropdown({
  leagueId,
  activityId,
  symbol,
  measurementType,
  frequency,
  supportsFrequency = true,
  initialConfig,
  onMinimumChange,
  onFrequencyChange,
}: ActivityMinimumProps) {
  const unit = getUnitLabel(measurementType);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const [baseMin, setBaseMin] = useState<number | null>(initialConfig?.min_value ?? null);
  const [ageOverrides, setAgeOverrides] = useState<AgeOverride[]>(
    parseAgeOverrides(initialConfig?.age_group_overrides || {})
  );
  const [frequencyDraft, setFrequencyDraft] = useState<string>(
    typeof frequency === 'number' ? String(frequency) : ''
  );

  // Sync state with initialConfig when it changes
  useEffect(() => {
    setBaseMin(initialConfig?.min_value ?? null);
  }, [initialConfig?.min_value]);

  useEffect(() => {
    setAgeOverrides(parseAgeOverrides(initialConfig?.age_group_overrides || {}));
  }, [initialConfig?.age_group_overrides]);

  useEffect(() => {
    setFrequencyDraft(typeof frequency === 'number' ? String(frequency) : '');
  }, [frequency]);

  function parseAgeOverrides(overrides: Record<string, any>): AgeOverride[] {
    const result: AgeOverride[] = [];
    let id = 0;

    Object.entries(overrides).forEach(([key, value]) => {
      if (value.ageRange && value.minValue !== undefined) {
        result.push({
          id: `override-${id++}`,
          ageMin: value.ageRange.min,
          ageMax: value.ageRange.max,
          minValue: value.minValue,
          maxValue: value.minValue * 2, // Auto-calculate max as min * 2
        });
      }
    });

    return result;
  }

  function buildAgeGroupOverrides(): Record<string, any> {
    const overrides: Record<string, any> = {};
    ageOverrides.forEach((override, idx) => {
      const key = `tier${idx}`;
      overrides[key] = {
        ageRange: {
            min: override.ageMin ?? 0,
            max: override.ageMax ?? 0,
        },
          minValue: override.minValue ?? 0,
      };
    });
    return overrides;
  }

  function addAgeOverride() {
    setAgeOverrides((prev) => [
      ...prev,
      {
        id: `override-${Date.now()}`,
        ageMin: 0,
        ageMax: 18,
        minValue: baseMin ?? 50,
        maxValue: (baseMin ?? 50) * 2,
      },
    ]);
  }

  function updateOverride(id: string, updates: Partial<AgeOverride>) {
    setAgeOverrides((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  }

  function removeOverride(id: string) {
    setAgeOverrides((prev) => prev.filter((o) => o.id !== id));
  }

  async function handleSave() {
    if (ageOverrides.some((override) => override.ageMin === null || override.ageMax === null || override.minValue === null)) {
      toast.error('Please fill all age override fields before saving.');
      return;
    }
    if (onMinimumChange) {
      onMinimumChange({
        activity_id: activityId,
        min_value: baseMin,
        age_group_overrides: buildAgeGroupOverrides(),
      });
    }
    setIsExpanded(false);
  }

  const hasConfig = baseMin !== null || ageOverrides.length > 0;

  return (
    <div className="mt-3 border-t pt-3">
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        variant="ghost"
        size="sm"
        className="h-auto p-0 flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown
          className={cn('size-4 transition-transform', isExpanded && 'rotate-180')}
        />
        ⚙️ Configure
      </Button>

      {isExpanded && (
        <div className="mt-3 space-y-3 p-3 bg-muted/30 rounded-lg border border-border/60">
          {/* Weekly Frequency */}
          {supportsFrequency && (
            <div className="space-y-2 pb-3 border-b">
              <h4 className="text-xs font-semibold">Weekly Frequency</h4>
              <div className="flex items-center gap-2">
                <Select
                  value={frequencyDraft || undefined}
                  onValueChange={(value) => {
                    setFrequencyDraft(value);
                    onFrequencyChange?.(activityId, value);
                  }}
                >
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 7 }, (_, idx) => {
                      const value = String(idx + 1);
                      return (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <span className="text-xs text-muted-foreground">submissions per week</span>
              </div>
            </div>
          )}

          {/* Base Tier */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold">Activity Minimums</h4>
            <h5 className="text-xs font-medium text-foreground/80">Base Tier (All Ages)</h5>
            <p className="text-xs text-muted-foreground">
              Set minimum only. Maximum auto-calculated as minimum × 2 (RR: 1.0-2.0)
            </p>
            <div className="space-y-1">
              <Label className="text-xs">Minimum ({unit})</Label>
              <Input
                type="number"
                min="0"
                        step="1"
                value={baseMin ?? ''}
                onChange={(e) =>
                          setBaseMin(e.target.value ? parseInt(e.target.value, 10) : null)
                }
                placeholder={`${getDefaultValues(measurementType).min} (default)`}
                className="h-7 text-xs"
              />
              {baseMin !== null && (
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Maximum: {baseMin * 2} {unit}
                </p>
              )}
            </div>
          </div>

          {/* Age Overrides */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold">Age Overrides</h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={addAgeOverride}
                className="h-6 px-2 text-xs gap-1"
              >
                <Plus className="size-3" />
                Add
              </Button>
            </div>

            <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border border-border/60">
              Set different minimum requirements for specific age groups. For example: "Ages 0-20 need 30-60 minutes" and "Ages 60+ need 20-40 minutes". Everything in between uses the base tier.
            </p>

            {ageOverrides.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No overrides. Base tier applies to all ages.
              </p>
            ) : (
              <div className="space-y-2">
                {ageOverrides.map((override, idx) => (
                  <div
                    key={override.id}
                    className="flex flex-col gap-2 text-xs bg-muted/20 p-2 rounded border border-border/60"
                  >
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-semibold text-muted-foreground whitespace-nowrap">Ages</span>
                      <Input
                        type="number"
                        min="0"
                        max="120"
                        step="1"
                        value={override.ageMin ?? ''}
                        onChange={(e) =>
                          updateOverride(override.id, {
                            ageMin: e.target.value === '' ? null : parseInt(e.target.value, 10),
                          })
                        }
                        className="h-6 w-10 text-xs p-1"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="number"
                        min="0"
                        max="120"
                        step="1"
                        value={override.ageMax ?? ''}
                        onChange={(e) =>
                          updateOverride(override.id, {
                            ageMax: e.target.value === '' ? null : parseInt(e.target.value, 10),
                          })
                        }
                        className="h-6 w-10 text-xs p-1"
                      />
                    </div>
                    
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="font-semibold text-muted-foreground whitespace-nowrap">Minimum {unit}:</span>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={override.minValue ?? ''}
                        onChange={(e) =>
                          updateOverride(override.id, {
                            minValue: e.target.value === '' ? null : parseInt(e.target.value, 10),
                          })
                        }
                        className="h-6 w-10 text-xs p-1"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeOverride(override.id)}
                        className="h-6 w-6 p-0 ml-auto"
                      >
                        <Trash2 className="size-3 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save button */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={handleSave}
              size="sm"
              className="h-7 text-xs"
            >
              Mark as Changed
            </Button>
            <Button
              onClick={() => setIsExpanded(false)}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
