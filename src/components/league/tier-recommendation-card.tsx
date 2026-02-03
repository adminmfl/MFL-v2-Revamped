'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TierConfig, TierRecommendation, PriceBreakdown, formatCurrency } from '@/lib/services/tier-helpers';

interface TierRecommendationCardProps {
  recommendation: TierRecommendation | null;
  tier: TierConfig | null;
  priceBreakdown: PriceBreakdown | null;
  isLoading: boolean;
  onViewAllTiers: () => void;
  onChangeTier: () => void;
}

export function TierRecommendationCard({
  recommendation,
  tier,
  priceBreakdown,
  isLoading,
  onViewAllTiers,
  onChangeTier,
}: TierRecommendationCardProps) {
  if (!tier || !recommendation) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="mt-1 rounded-lg bg-primary/10 p-2">
              <Sparkles className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{tier.display_name}</CardTitle>
                <Badge variant="default" className="text-xs">
                  Recommended
                </Badge>
              </div>
              <CardDescription className="text-sm mt-1">
                {recommendation.reason}
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Display */}
        {priceBreakdown && (
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              {priceBreakdown.pricing_type === 'fixed' && tier.pricing.fixed_price ? (
                <>
                  <span className="text-3xl font-bold text-primary">
                    {formatCurrency(priceBreakdown.total)}
                  </span>
                  <span className="text-sm text-muted-foreground">for {priceBreakdown.duration_days} days</span>
                </>
              ) : (
                <>
                  <span className="text-3xl font-bold text-primary">
                    {formatCurrency(priceBreakdown.total)}
                  </span>
                  <span className="text-sm text-muted-foreground">estimated</span>
                </>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="bg-white/40 dark:bg-black/20 rounded-lg p-3 space-y-2 text-sm">
              {priceBreakdown.breakdown_details.map((detail, idx) => (
                <div key={idx} className="flex justify-between text-muted-foreground">
                  <span>{detail.split(':')[0]?.trim()}</span>
                  <span className="font-medium text-foreground">{detail.split(':')[1]?.trim()}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(priceBreakdown.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tier Limits */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/40 dark:bg-black/20 p-3">
            <div className="text-xs text-muted-foreground">Max Duration</div>
            <div className="text-lg font-semibold">{tier.max_days} days</div>
          </div>
          <div className="rounded-lg bg-white/40 dark:bg-black/20 p-3">
            <div className="text-xs text-muted-foreground">Max Participants</div>
            <div className="text-lg font-semibold">{tier.max_participants}</div>
          </div>
        </div>

        {/* Features */}
        {tier.features && tier.features.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="size-4" />
              Includes
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {tier.features.slice(0, 3).map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tier Description */}
        {tier.description && (
          <p className="text-sm text-muted-foreground italic bg-white/30 dark:bg-black/10 rounded p-2">
            {tier.description}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onViewAllTiers}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            View All Tiers
          </Button>
          <Button
            onClick={onChangeTier}
            variant="ghost"
            size="sm"
            className="px-3"
          >
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
