// =====================================================================================
// League Activity Minimums Service
// Description: Service layer for managing configurable activity minimums with caching
// =====================================================================================

import { createServerClient } from '@/lib/supabase/server';
import { getClientCache, setClientCache, invalidateClientCache } from '@/lib/client-cache';
import type {
  LeagueActivityMinimum,
  ActivityMeasurementType,
  MinimumThreshold,
  AgeGroupOverrides,
  ApplicableMinimum,
  AgeTier,
  DEFAULT_MINIMUMS,
  ValidationResult,
  ValidationError
} from '@/types/league-minimums';

// =====================================================================================
// CACHING CONFIGURATION
// =====================================================================================

// Cache TTL: 30 minutes (minimums change rarely, read very frequently)
const LEAGUE_MINIMUMS_TTL = 30 * 60 * 1000; // 30 minutes in milliseconds

/**
 * Generate cache key for league minimums
 */
function getCacheKey(leagueId: string): string {
  return `league_minimums:${leagueId}`;
}

// =====================================================================================
// AGE TIER RESOLUTION
// =====================================================================================

/**
 * Determine age tier based on user's age
 * 3-tier system: below40, base (40-60), above60
 * 
 * @param age - User's age (null if unknown)
 * @returns Age tier
 */
export function getTierForAge(age: number | null): AgeTier {
  if (age === null) return 'base';  // No age provided, use base
  if (age < 40) return 'below40';
  if (age >= 60) return 'above60';
  return 'base';  // Ages 40-59
}

// =====================================================================================
// APPLICABLE MINIMUM CALCULATION
// =====================================================================================

/**
 * Get applicable minimum for a specific user age
 * Checks age tier and applies override if exists, otherwise uses base
 * 
 * @param config - League activity minimum configuration
 * @param age - User's age (null if unknown)
 * @returns Applicable minimum with tier information
 */
export function getApplicableMinimum(
  config: LeagueActivityMinimum,
  age: number | null
): ApplicableMinimum {
  const tier = getTierForAge(age);
  
  // Check for age-based override
  if (tier === 'below40' && config.age_group_overrides?.below40) {
    const override = config.age_group_overrides.below40;
    return {
      min: override.minValue,
      max: override.maxValue,
      tier: 'below40'
    };
  }
  
  if (tier === 'above60' && config.age_group_overrides?.above60) {
    const override = config.age_group_overrides.above60;
    return {
      min: override.minValue,
      max: override.maxValue,
      tier: 'above60'
    };
  }
  
  // Fall back to base minimum (ages 40-60 or no override)
  return {
    min: config.min_value ?? 0,
    max: config.max_value ?? 0,
    tier: 'base'
  };
}

// =====================================================================================
// DATABASE OPERATIONS (WITH CACHING)
// =====================================================================================

/**
 * Get all activity minimums for a league
 * CACHE-FIRST: Checks cache before hitting database
 * 
 * @param leagueId - League ID
 * @returns Array of league activity minimums
 */
export async function getLeagueActivityMinimums(
  leagueId: string
): Promise<LeagueActivityMinimum[]> {
  const cacheKey = getCacheKey(leagueId);
  
  // 1. Check cache first (FAST PATH)
  const cached = getClientCache<LeagueActivityMinimum[]>(cacheKey);
  if (cached) {
    console.log(`[Cache HIT] League minimums for ${leagueId}`);
    return cached;
  }
  
  // 2. Cache miss - fetch from database (SLOW PATH)
  console.log(`[Cache MISS] Fetching league minimums for ${leagueId}`);
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from('leagueactivities')
    .select(`
      id,
      league_id,
      activity_id,
      min_value,
      max_value,
      min_rr,
      max_rr,
      age_group_overrides,
      created_at,
      created_by,
      modified_by,
      modified_date
    `)
    .eq('league_id', leagueId)
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching league minimums:', error);
    throw new Error(`Failed to fetch league minimums: ${error.message}`);
  }
  
  const minimums = (data || []).map(row => ({
    ...row,
    age_group_overrides: row.age_group_overrides ?? {}
  }));
  
  // 3. Store in cache for 30 minutes
  setClientCache(cacheKey, minimums, LEAGUE_MINIMUMS_TTL);
  console.log(`[Cache SET] Cached ${minimums.length} minimums for ${leagueId} (TTL: 30min)`);
  
  return minimums;
}

/**
 * Get minimum for specific activity
 * 
 * @param leagueId - League ID
 * @param activityId - Activity ID
 * @returns League activity minimum or null
 */
export async function getActivityMinimum(
  leagueId: string,
  activityId: string
): Promise<LeagueActivityMinimum | null> {
  const minimums = await getLeagueActivityMinimums(leagueId);
  
  const minimum = minimums.find(m => m.activity_id === activityId);
  
  return minimum || null;
}

/**
 * Save or update activity minimum configuration
 * Invalidates cache after successful write
 * 
 * @param leagueId - League ID
 * @param config - Activity minimum configuration
 * @param userId - User ID (for audit trail)
 * @returns Saved configuration
 */
export async function saveActivityMinimum(
  leagueId: string,
  config: {
    activityId: string;
    minValue: number;
    maxValue: number;
    ageGroupOverrides?: AgeGroupOverrides;
  },
  userId?: string
): Promise<LeagueActivityMinimum> {
  const supabase = createClient();
  
  // Validate input
  const validation = validateMinimumConfig(config);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }
  
  // Update the existing leagueactivity row
  const { data: result, error } = await supabase
    .from('leagueactivities')
    .update({
      min_value: config.minValue,
      max_value: config.maxValue,
      age_group_overrides: config.ageGroupOverrides || {},
      modified_by: userId,
      modified_date: new Date().toISOString()
    })
    .eq('league_id', leagueId)
    .eq('activity_id', config.activityId)
    .select()
    .single();
  
  if (error) {
    console.error('Error saving activity minimum:', error);
    throw new Error(`Failed to save activity minimum: ${error.message}`);
  }
  
  // CRITICAL: Invalidate cache immediately
  const cacheKey = getCacheKey(leagueId);
  invalidateClientCache(cacheKey);
  console.log(`[Cache INVALIDATED] League minimums for ${leagueId} (after save)`);
  
  return {
    ...result,
    age_group_overrides: result.age_group_overrides ?? {}
  };
}

/**
 * Reset activity minimum configuration to NULL (reverts to hardcoded defaults)
 * 
 * @param leagueId - League ID
 * @param activityId - Activity ID to reset
 * @returns Success status
 */
export async function deleteActivityMinimum(
  leagueId: string,
  activityId: string
): Promise<void> {
  const supabase = createClient();
  
  // Reset minimums to NULL (will use hardcoded defaults)
  const { error } = await supabase
    .from('leagueactivities')
    .update({
      min_value: null,
      max_value: null,
      age_group_overrides: {},
      modified_date: new Date().toISOString()
    })
    .eq('league_id', leagueId)
    .eq('activity_id', activityId);
  
  if (error) {
    console.error('Error resetting activity minimum:', error);
    throw new Error(`Failed to reset activity minimum: ${error.message}`);
  }
  
  // CRITICAL: Invalidate cache immediately
  const cacheKey = getCacheKey(leagueId);
  invalidateClientCache(cacheKey);
  console.log(`[Cache INVALIDATED] League minimums for ${leagueId} (after reset)`);
}

/**
 * Initialize default minimums for all activities in a league
 * Run this for new leagues or to reset to defaults
 * 
 * @param leagueId - League ID
 * @param userId - User ID (for audit trail)
 */
export async function initializeLeagueDefaultMinimums(
  leagueId: string,
  userId?: string
): Promise<void> {
  const supabase = createClient();
  
  // Call the PostgreSQL function
  const { error } = await supabase.rpc('initialize_league_default_minimums', {
    p_league_id: leagueId
  });
  
  if (error) {
    console.error('Error initializing default minimums:', error);
    throw new Error(`Failed to initialize default minimums: ${error.message}`);
  }
  
  // Invalidate cache
  const cacheKey = getCacheKey(leagueId);
  invalidateClientCache(cacheKey);
  console.log(`[Cache INVALIDATED] League minimums for ${leagueId} (after initialization)`);
}

// =====================================================================================
// VALIDATION
// =====================================================================================

/**
 * Validate minimum configuration
 */
function validateMinimumConfig(config: {
  minValue: number;
  maxValue: number;
  ageGroupOverrides?: AgeGroupOverrides;
}): ValidationResult {
  const errors: ValidationError[] = [];
  
  // Validate base values
  if (config.minValue <= 0) {
    errors.push({ field: 'minValue', message: 'Minimum value must be greater than 0' });
  }
  
  if (config.maxValue <= config.minValue) {
    errors.push({ field: 'maxValue', message: 'Maximum value must be greater than minimum value' });
  }
  
  // Validate age group overrides
  if (config.ageGroupOverrides?.below40) {
    const override = config.ageGroupOverrides.below40;
    if (override.minValue <= 0) {
      errors.push({ field: 'below40.minValue', message: 'Below 40 minimum must be greater than 0' });
    }
    if (override.maxValue <= override.minValue) {
      errors.push({ field: 'below40.maxValue', message: 'Below 40 maximum must be greater than minimum' });
    }
  }
  
  if (config.ageGroupOverrides?.above60) {
    const override = config.ageGroupOverrides.above60;
    if (override.minValue <= 0) {
      errors.push({ field: 'above60.minValue', message: 'Above 60 minimum must be greater than 0' });
    }
    if (override.maxValue <= override.minValue) {
      errors.push({ field: 'above60.maxValue', message: 'Above 60 maximum must be greater than minimum' });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

/**
 * Check if a league has configured minimums
 */
export async function hasConfiguredMinimums(leagueId: string): Promise<boolean> {
  const minimums = await getLeagueActivityMinimums(leagueId);
  return minimums.length > 0;
}

/**
 * Get default minimum values for a measurement type
 */
export function getDefaultMinimum(measurementType: ActivityMeasurementType): { min: number; max: number } {
  const defaults: Record<ActivityMeasurementType, { min: number; max: number }> = {
    duration: { min: 45, max: 90 },
    distance: { min: 4, max: 20 },
    steps: { min: 10000, max: 20000 },
    hole: { min: 9, max: 18 }
  };
  
  return defaults[measurementType];
}
