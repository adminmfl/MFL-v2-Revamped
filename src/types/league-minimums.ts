// =====================================================================================
// League Activity Minimums - Type Definitions
// Description: TypeScript types for configurable activity minimums with age support
// =====================================================================================

import { Database } from './database';

// =====================================================================================
// CORE TYPES
// =====================================================================================

export type ActivityMeasurementType = 'duration' | 'distance' | 'steps' | 'hole';

export type AgeTier = 'below40' | 'base' | 'above60';

// =====================================================================================
// MINIMUM THRESHOLD
// =====================================================================================

export interface MinimumThreshold {
  minValue: number;
  maxValue: number;
  // RR range is always 1.0 to 2.0 (hardcoded in calculation logic)
}

// =====================================================================================
// AGE GROUP OVERRIDES (JSONB structure)
// =====================================================================================

export interface AgeGroupOverrides {
  below40?: MinimumThreshold;  // Optional: For ages < 40
  above60?: MinimumThreshold;  // Optional: For ages >= 60
  // Base (ages 40-60) is stored in the main columns (min_value, max_value)
}

// =====================================================================================
// LEAGUE ACTIVITY (with minimums) - Database Row
// =====================================================================================

export interface LeagueActivityWithMinimums {
  id: string;
  league_id: string;
  activity_id: string;
  
  // Base minimum (ages 40-60) - nullable for backward compatibility
  min_value: number | null;
  max_value: number | null;
  // Note: RR range is always 1.0-2.0 (not stored in DB)
  
  // Age overrides
  age_group_overrides: AgeGroupOverrides | null;
  
  // Audit fields
  created_at?: string;
  created_by?: string | null;
  modified_by?: string | null;
  modified_date?: string | null;
}

// Alias for backward compatibility
export type LeagueActivityMinimum = LeagueActivityWithMinimums;

// =====================================================================================
// API REQUEST/RESPONSE TYPES
// =====================================================================================

/**
 * Request body for creating/updating activity minimums
 */
export interface SaveActivityMinimumRequest {
  activityId: string;
  measurementType: ActivityMeasurementType;
  baseMinimum: {
    min: number;
    max: number;
  };
  ageGroupOverrides?: {
    below40?: {
      min: number;
      max: number;
    };
    above60?: {
      min: number;
      max: number;
    };
  };
}

/**
 * Response for activity minimum operations
 */
export interface ActivityMinimumResponse {
  id: string;
  activityId: string;
  activityName?: string;
  measurementType: ActivityMeasurementType;
  baseMinimum: {
    min: number;
    max: number;
  };
  ageGroupOverrides: AgeGroupOverrides;
}

/**
 * List response
 */
export interface ActivityMinimumsListResponse {
  success: boolean;
  data: ActivityMinimumResponse[];
}

/**
 * Single item response
 */
export interface ActivityMinimumSingleResponse {
  success: boolean;
  data: ActivityMinimumResponse;
}

// =====================================================================================
// SERVICE TYPES
// =====================================================================================

/**
 * Applicable minimum for a specific user age
 */
export interface ApplicableMinimum {
  min: number;
  max: number;
  tier: AgeTier;  // Which tier was applied
  // RR range is always 1.0-2.0
}

/**
 * Default minimums by measurement type
 */
export const DEFAULT_MINIMUMS: Record<ActivityMeasurementType, { min: number; max: number }> = {
  duration: { min: 45, max: 90 },      // Minutes
  distance: { min: 4, max: 20 },       // Kilometers
  steps: { min: 10000, max: 20000 },   // Steps
  hole: { min: 9, max: 18 }            // Golf holes
};

// =====================================================================================
// VALIDATION TYPES
// =====================================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
