// ============================================================================
// Type Definitions for New Tier System
// ============================================================================

export interface TierConfig {
  tier_id: string;
  tier_name: string;
  display_name: string;
  description: string;
  max_days: number;
  max_participants: number;
  is_featured: boolean;
  features: string[];
  pricing: {
    id: string;
    pricing_type: 'fixed' | 'dynamic';
    fixed_price: number | null;
    base_fee: number;
    per_day_rate: number;
    per_participant_rate: number;
    gst_percentage: number;
  };
}

export interface PriceBreakdown {
  tier_id: string;
  tier_name: string;
  pricing_type: 'fixed' | 'dynamic';
  duration_days: number;
  participants: number;
  base_fee?: number;
  days_cost?: number;
  participants_cost?: number;
  subtotal: number;
  gst_amount: number;
  total: number;
  currency: string;
  breakdown_details: string[];
}

export interface TierValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Fetch active tiers from the API
 */
export async function fetchActiveTiers(): Promise<TierConfig[]> {
  try {
    const res = await fetch('/api/leagues/tiers');
    const json = await res.json();

    if (!res.ok || !json.success) {
      console.error('Failed to fetch tiers:', json.error);
      return [];
    }

    return json.data?.tiers || [];
  } catch (error) {
    console.error('Error fetching tiers:', error);
    return [];
  }
}

/**
 * Get price preview for a league configuration
 */
export async function getPricePreview(
  tier_id: string,
  duration_days: number,
  estimated_participants: number
): Promise<{ breakdown: PriceBreakdown; validation: TierValidationResult } | null> {
  try {
    const res = await fetch('/api/tiers/preview-price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier_id,
        duration_days,
        estimated_participants,
      }),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      console.error('Price preview failed:', json.error);
      return null;
    }

    return {
      breakdown: json.price_breakdown,
      validation: json.validation,
    };
  } catch (error) {
    console.error('Error getting price preview:', error);
    return null;
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Calculate duration in days between two dates
 */
export function calculateDuration(startDate: Date, endDate: Date): number {
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end dates
}

/**
 * Get tier limit display string
 */
export function getTierLimitDisplay(tier: TierConfig): string {
  return `Up to ${tier.max_days} days, ${tier.max_participants} participants`;
}

/**
 * Check if a tier is recommended (featured or specific criteria)
 */
export function isRecommendedTier(tier: TierConfig): boolean {
  return tier.is_featured || tier.features.includes('featured');
}
/**
 * Tier recommendation result
 */
export interface TierRecommendation {
  tier_id: string;
  tier_name: string;
  display_name: string;
  reason: string; // "Perfect fit", "Recommended", "Smallest suitable tier"
  isRecommended: boolean;
  fits: boolean; // All limits respected
  priceWarning?: string; // e.g., "₹X more than smaller tier"
}

/**
 * Recommend a tier based on league requirements
 * Strategy: Find cheapest tier that doesn't waste capacity
 */
export function recommendTier(
  tiers: TierConfig[],
  durationDays: number,
  estimatedParticipants: number
): TierRecommendation | null {
  if (!tiers || tiers.length === 0) return null;

  // Filter tiers that fit all constraints
  const suitableTiers = tiers.filter(
    (tier) => durationDays <= tier.max_days && estimatedParticipants <= tier.max_participants
  );

  if (suitableTiers.length === 0) return null;

  // Find the tier with smallest capacity that still fits (most cost-efficient)
  const recommended = suitableTiers.reduce((best, current) => {
    const bestCapacity = best.max_participants * best.max_days;
    const currentCapacity = current.max_participants * current.max_days;
    return currentCapacity < bestCapacity ? current : best;
  });

  // Determine reason
  let reason = 'Perfect fit';
  if (recommended.is_featured) {
    reason = 'Recommended - Most popular';
  } else if (suitableTiers.length === 1) {
    reason = 'Smallest suitable tier';
  } else {
    reason = 'Best value for your needs';
  }

  return {
    tier_id: recommended.tier_id,
    tier_name: recommended.tier_name,
    display_name: recommended.display_name,
    reason,
    isRecommended: true,
    fits: true,
  };
}

/**
 * Check if league requirements exceed a tier's limits
 */
export function tierExceedsLimits(
  tier: TierConfig,
  durationDays: number,
  estimatedParticipants: number
): { exceedsDays: boolean; exceedsParticipants: boolean } {
  return {
    exceedsDays: durationDays > tier.max_days,
    exceedsParticipants: estimatedParticipants > tier.max_participants,
  };
}

/**
 * Get the next tier that fits the requirements
 */
export function getNextSuitableTier(
  tiers: TierConfig[],
  currentTier: TierConfig,
  durationDays: number,
  estimatedParticipants: number
): TierConfig | null {
  const suitableTiers = tiers.filter(
    (tier) =>
      tier.tier_id !== currentTier.tier_id &&
      durationDays <= tier.max_days &&
      estimatedParticipants <= tier.max_participants
  );

  if (suitableTiers.length === 0) return null;

  // Return the cheapest suitable tier
  return suitableTiers.reduce((best, current) => {
    const bestCapacity = best.max_participants * best.max_days;
    const currentCapacity = current.max_participants * current.max_days;
    return currentCapacity < bestCapacity ? current : best;
  });
}