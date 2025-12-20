-- Fix specialchallenges table schema
-- Remove league_id (not needed for master template), add challenge_type

-- Step 1: Remove the foreign key constraint and league_id column
ALTER TABLE public.specialchallenges 
DROP CONSTRAINT IF EXISTS specialchallenges_league_id_fkey;

ALTER TABLE public.specialchallenges 
DROP COLUMN IF EXISTS league_id;

-- Step 2: Add missing challenge_type column
ALTER TABLE public.specialchallenges 
ADD COLUMN IF NOT EXISTS challenge_type varchar DEFAULT 'individual' CHECK (challenge_type IN ('individual', 'team', 'sub_team'));

-- Step 3: Drop and recreate the league index (it was pointing to deleted column)
DROP INDEX IF EXISTS idx_specialchallenges_league;

-- Update comment
COMMENT ON TABLE public.specialchallenges IS 'Master challenge templates (reusable across leagues). Examples: Bingo, Max Steps, Unique Day';
COMMENT ON COLUMN public.specialchallenges.challenge_type IS 'Challenge scope: individual, team, or sub_team';
