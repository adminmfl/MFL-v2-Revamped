-- Add frequency_type for leagueactivities and adjust frequency range constraints

ALTER TABLE public.leagueactivities
  ADD COLUMN IF NOT EXISTS frequency_type text DEFAULT 'weekly';

-- Ensure only supported values
ALTER TABLE public.leagueactivities
  DROP CONSTRAINT IF EXISTS leagueactivities_frequency_type_check;

ALTER TABLE public.leagueactivities
  ADD CONSTRAINT leagueactivities_frequency_type_check
  CHECK (frequency_type IN ('weekly', 'monthly'));

-- Update frequency range constraint to depend on frequency_type
ALTER TABLE public.leagueactivities
  DROP CONSTRAINT IF EXISTS leagueactivities_frequency_range;

ALTER TABLE public.leagueactivities
  DROP CONSTRAINT IF EXISTS leagueactivities_frequency_check;

ALTER TABLE public.leagueactivities
  ADD CONSTRAINT leagueactivities_frequency_range
  CHECK (
    frequency IS NULL
    OR (
      frequency_type = 'weekly'
      AND frequency >= 0 AND frequency <= 7
    )
    OR (
      frequency_type = 'monthly'
      AND frequency >= 0 AND frequency <= 28
    )
  );

COMMENT ON COLUMN public.leagueactivities.frequency IS 'Max submissions allowed per period per user (weekly: 0-7, monthly: 0-28, or NULL for unlimited)';
COMMENT ON COLUMN public.leagueactivities.frequency_type IS 'Period type for frequency limit (weekly or monthly)';
