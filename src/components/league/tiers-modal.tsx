'use client';

import React from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TierConfig, TierRecommendation, formatCurrency } from '@/lib/services/tier-helpers';
import { useIsMobile } from '@/hooks/use-mobile';

interface TiersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tiers: TierConfig[];
  selectedTierId: string | null;
  recommendedTierId?: string;
  onSelectTier: (tierId: string) => void;
}

export function TiersModal({
  open,
  onOpenChange,
  tiers,
  selectedTierId,
  recommendedTierId,
  onSelectTier,
}: TiersModalProps) {
  const isMobile = useIsMobile();

  const handleSelectTier = (tierId: string) => {
    onSelectTier(tierId);
    onOpenChange(false);
  };

  const content = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {tiers.map((tier) => {
          const isSelected = selectedTierId === tier.tier_id;
          const isRecommended = recommendedTierId === tier.tier_id;
          const isFeatured = tier.is_featured;

          return (
            <div
              key={tier.tier_id}
              onClick={() => handleSelectTier(tier.tier_id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectTier(tier.tier_id);
                }
              }}
              className={cn(
                'relative flex flex-col gap-3 p-4 md:p-5 rounded-lg border-2 transition-all duration-200 text-left cursor-pointer',
                'hover:border-primary/50 hover:bg-primary/5 active:scale-95',
                isSelected
                  ? 'border-primary bg-primary/10 shadow-md shadow-primary/20'
                  : 'border-border bg-card'
              )}
            >
              {/* Header with badges */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={cn(
                      'text-base md:text-lg font-semibold truncate',
                      isSelected && 'text-primary'
                    )}>
                      {tier.display_name}
                    </h3>
                  </div>
                </div>
                {isSelected && (
                  <div className="flex-shrink-0 size-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="size-4 text-primary-foreground" />
                  </div>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1">
                {isFeatured && (
                  <Badge variant="default" className="text-xs">
                    Featured
                  </Badge>
                )}
                {isRecommended && (
                  <Badge className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30">
                    Recommended
                  </Badge>
                )}
              </div>

              {/* Pricing */}
              <div className="space-y-1">
                {tier.pricing.pricing_type === 'fixed' && tier.pricing.fixed_price ? (
                  <div>
                    <div className={cn(
                      'text-2xl font-bold',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}>
                      {formatCurrency(tier.pricing.fixed_price)}
                    </div>
                    <p className="text-xs text-muted-foreground">fixed price</p>
                  </div>
                ) : (
                  <div>
                    <div className={cn(
                      'text-lg font-bold',
                      isSelected ? 'text-primary' : 'text-foreground'
                    )}>
                      Custom pricing
                    </div>
                    <p className="text-xs text-muted-foreground">based on duration & participants</p>
                  </div>
                )}
              </div>

              {/* Limits */}
              <div className="space-y-1.5 bg-muted/30 -mx-4 -mb-4 px-4 py-3 rounded-b-[calc(0.5rem-2px)]">
                <div className="text-xs font-semibold text-muted-foreground">Limits</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">Duration</span>
                    <div className="font-semibold">{tier.max_days} days</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Participants</span>
                    <div className="font-semibold">{tier.max_participants}</div>
                  </div>
                </div>
              </div>

              {/* Select Button (visible on mobile/smaller) */}
              <Button
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                className="w-full mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {isSelected ? 'Selected' : 'Select'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="p-0">
          <div className="px-4 pt-4 pb-2">
            <DrawerHeader className="p-0">
              <DrawerTitle className="flex items-center gap-2">
                <Crown className="size-5 text-primary" />
                All Pricing Tiers
              </DrawerTitle>
              <DrawerDescription>
                Select the tier that best fits your league needs
              </DrawerDescription>
            </DrawerHeader>
          </div>
          <div className="px-4 pb-6 max-h-[70vh] overflow-y-auto">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="size-5 text-primary" />
            All Pricing Tiers
          </DialogTitle>
          <DialogDescription>
            Compare all available tiers and select the one that fits your league best
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  );
}
