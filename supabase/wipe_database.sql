-- =====================================================================================
-- DANGER: Complete Database Wipe Script
-- Description: Drops ALL tables, types, functions, and extensions
-- WARNING: This will DELETE ALL DATA permanently!
-- =====================================================================================
-- Usage: Run this in Supabase SQL Editor or via psql
-- After running, re-run migrations to recreate schema
-- =====================================================================================

-- Disable triggers temporarily to avoid foreign key issues during drop
SET session_replication_role = 'replica';

-- =====================================================================================
-- DROP ALL TABLES (in reverse dependency order)
-- =====================================================================================

-- Challenge-related tables
DROP TABLE IF EXISTS public.specialchallengeteamscore CASCADE;
DROP TABLE IF EXISTS public.specialchallengeindividualuserscore CASCADE;
DROP TABLE IF EXISTS public.leagueschallenges CASCADE;
DROP TABLE IF EXISTS public.specialchallenges CASCADE;

-- Workout submissions
DROP TABLE IF EXISTS public.effortentry CASCADE;

-- Team membership & roles
DROP TABLE IF EXISTS public.teammembers CASCADE;
DROP TABLE IF EXISTS public.assignedrolesforleague CASCADE;
DROP TABLE IF EXISTS public.leaguemembers CASCADE;
DROP TABLE IF EXISTS public.teamleagues CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- League configuration
DROP TABLE IF EXISTS public.leagueinvites CASCADE;
DROP TABLE IF EXISTS public.leagueactivities CASCADE;
DROP TABLE IF EXISTS public.leagues CASCADE;

-- Payments
DROP TABLE IF EXISTS public.payments CASCADE;

-- Core tables
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;
DROP TABLE IF EXISTS public.pricing CASCADE;
DROP TABLE IF EXISTS public.email_otps CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- =====================================================================================
-- DROP FUNCTIONS
-- =====================================================================================

DROP FUNCTION IF EXISTS update_modified_date() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS get_user_roles_in_league(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_host(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_governor(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_captain(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS is_player(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_user_team_in_league(uuid, uuid) CASCADE;

-- =====================================================================================
-- DROP TYPES
-- =====================================================================================

DROP TYPE IF EXISTS effort_status CASCADE;
DROP TYPE IF EXISTS platform_role CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS payment_purpose CASCADE;

-- =====================================================================================
-- RE-ENABLE TRIGGERS
-- =====================================================================================

SET session_replication_role = 'origin';

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

-- Run this to verify all tables are dropped:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- =====================================================================================
-- NEXT STEPS
-- =====================================================================================
-- 1. Run this script in Supabase SQL Editor
-- 2. Re-run migrations: supabase db push (or apply migrations manually)
-- 3. (Optional) Wipe storage bucket using scripts/wipe-storage.ts
-- =====================================================================================
