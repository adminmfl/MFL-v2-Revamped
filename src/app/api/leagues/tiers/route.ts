/**
 * GET /api/leagues/tiers
 * Returns league tiers (basic/medium/pro/custom) along with matching pricing.
 * pricing.id is mapped to league_tiers.tier_id.
 */

import { NextResponse } from 'next/server';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

type TierRow = {
  tier_id: string;
  tier_name: string;
  [key: string]: any;
};

type PricingRow = {
  id: string;
  base_price: number;
  platform_fee: number;
  gst_percentage: number;
  per_day_rate?: number | null;
  per_participant_rate?: number | null;
  [key: string]: any;
};

export async function GET() {
  try {
    const supabase = getSupabaseServiceRole();

    const { data: tiers, error: tiersError } = await supabase
      .from('league_tiers')
      .select('*')
      .in('tier_name', ['basic', 'medium', 'pro', 'custom']);

    if (tiersError) {
      console.error('Error fetching league tiers:', tiersError);
      return NextResponse.json({ error: 'Failed to fetch tiers' }, { status: 500 });
    }

    const tierRows = (tiers || []) as TierRow[];
    const tierIds = tierRows.map((t) => t.tier_id).filter(Boolean);

    let pricingRows: PricingRow[] = [];
    if (tierIds.length) {
      const { data: pricing, error: pricingError } = await supabase
        .from('pricing')
        .select('*')
        .in('id', tierIds);

      if (pricingError) {
        console.error('Error fetching pricing for tiers:', pricingError);
        return NextResponse.json({ error: 'Failed to fetch pricing' }, { status: 500 });
      }

      pricingRows = (pricing || []) as PricingRow[];
    }

    const pricingById = new Map(pricingRows.map((p) => [p.id, p] as const));

    const out = tierRows
      .map((t) => ({
        ...t,
        pricing: pricingById.get(t.tier_id) || null,
      }))
      // stable ordering
      .sort((a, b) => {
        const order = { basic: 1, medium: 2, pro: 3, custom: 4 } as Record<string, number>;
        return (order[String(a.tier_name)] || 999) - (order[String(b.tier_name)] || 999);
      });

    return NextResponse.json({ success: true, data: { tiers: out } });
  } catch (err) {
    console.error('Error in /api/leagues/tiers:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
