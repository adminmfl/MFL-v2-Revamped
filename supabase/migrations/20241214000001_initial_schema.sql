-- =====================================================================================
-- Migration: Initial Schema
-- Description: Creates all core tables for MyFitnessLeague V2 platform
-- Author: MFL Engineering Team
-- Created: 2024-12-14
-- =====================================================================================
-- This migration establishes the complete database schema for the fitness league
-- platform including users, leagues, teams, submissions, and challenges.
-- Tables are created in dependency order to satisfy foreign key constraints.
-- =====================================================================================

-- Enable UUID extension for primary key generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================================
-- ENUMS & CUSTOM TYPES
-- =====================================================================================

/**
 * effort_status: Represents the validation state of a workout submission
 * - pending: Awaiting captain/governor review
 * - approved: Validated and counted toward score
 * - rejected: Invalid submission, does not count
 */
CREATE TYPE effort_status AS ENUM ('pending', 'approved', 'rejected');

/**
 * platform_role: Platform-level access control
 * - admin: Super admin with access to admin panel, pricing, analytics
 * - user: Regular user (default)
 */
CREATE TYPE platform_role AS ENUM ('admin', 'user');

-- =====================================================================================
-- CORE USER MANAGEMENT
-- =====================================================================================

/**
 * users: Core user account table
 * Primary table for all platform users regardless of role
 * Stores authentication credentials and basic profile information
 */
CREATE TABLE IF NOT EXISTS public.users (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username varchar NOT NULL UNIQUE,
  email varchar NOT NULL UNIQUE,
  password_hash varchar NOT NULL,
  phone varchar,
  date_of_birth date,
  gender varchar,
  platform_role platform_role DEFAULT 'user',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT users_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT users_username_length CHECK (char_length(username) >= 3)
);

-- Index for faster email-based login queries
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

COMMENT ON TABLE public.users IS 'Core user accounts with authentication and profile data';
COMMENT ON COLUMN public.users.platform_role IS 'Platform-level role: admin (super admin) or user (regular user)';
COMMENT ON COLUMN public.users.is_active IS 'Soft delete flag - false indicates deactivated account';

/**
 * email_otps: One-Time Password verification for email-based signup
 * Supports secure email verification flow during registration
 */
CREATE TABLE IF NOT EXISTS public.email_otps (
  id bigserial PRIMARY KEY,
  email text NOT NULL,
  otp text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT email_otps_expiry_future CHECK (expires_at > created_at)
);

-- Index for fast OTP lookup during verification
CREATE INDEX IF NOT EXISTS idx_email_otps_email_used ON public.email_otps(email, used);

COMMENT ON TABLE public.email_otps IS 'Temporary OTP storage for email verification during signup';

/**
 * pricing: Dynamic pricing configuration for league creation
 * Managed by admin via admin panel
 * Only one active pricing record at a time
 */
CREATE TABLE IF NOT EXISTS public.pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_price numeric NOT NULL,
  platform_fee numeric NOT NULL,
  gst_percentage numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT pricing_base_price_positive CHECK (base_price >= 0),
  CONSTRAINT pricing_platform_fee_positive CHECK (platform_fee >= 0),
  CONSTRAINT pricing_gst_percentage_valid CHECK (gst_percentage >= 0 AND gst_percentage <= 100)
);

-- Index for fetching active pricing
CREATE INDEX IF NOT EXISTS idx_pricing_active ON public.pricing(is_active);

COMMENT ON TABLE public.pricing IS 'Dynamic pricing configuration for league creation fees';
COMMENT ON COLUMN public.pricing.is_active IS 'Only one pricing record should be active at a time';

-- =====================================================================================
-- ROLE & PERMISSION SYSTEM
-- =====================================================================================

/**
 * roles: Role definitions for RBAC system
 * Defines available roles: Host, Governor, Captain, Player
 * Users can have multiple roles per league via assignedrolesforleague
 */
CREATE TABLE IF NOT EXISTS public.roles (
  role_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name varchar NOT NULL UNIQUE,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT roles_name_not_empty CHECK (char_length(role_name) > 0)
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON public.roles(role_name);

COMMENT ON TABLE public.roles IS 'Role definitions for role-based access control (Host, Governor, Captain, Player)';

-- =====================================================================================
-- LEAGUE MANAGEMENT
-- =====================================================================================

/**
 * leagues: League metadata and configuration
 * Represents a single fitness competition with start/end dates
 * Created by Host, immutable after launch (start_date reached)
 * Status: draft (created but not paid/launched), launched (paid, awaiting start),
 *         active (in progress), completed (ended)
 */
CREATE TABLE IF NOT EXISTS public.leagues (
  league_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_name varchar NOT NULL UNIQUE,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status varchar DEFAULT 'draft' CHECK (status IN ('draft', 'launched', 'active', 'completed')),
  is_active boolean DEFAULT true,
  num_teams integer DEFAULT 4,
  team_size integer DEFAULT 5,
  rest_days integer DEFAULT 1,
  is_public boolean DEFAULT false,
  is_exclusive boolean DEFAULT true,
  invite_code varchar(8) UNIQUE,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT leagues_date_order CHECK (end_date > start_date),
  CONSTRAINT leagues_name_length CHECK (char_length(league_name) >= 3),
  CONSTRAINT leagues_num_teams_positive CHECK (num_teams > 0),
  CONSTRAINT leagues_team_size_positive CHECK (team_size > 0),
  CONSTRAINT leagues_rest_days_valid CHECK (rest_days >= 0 AND rest_days <= 7)
);

CREATE INDEX IF NOT EXISTS idx_leagues_active ON public.leagues(is_active);
CREATE INDEX IF NOT EXISTS idx_leagues_dates ON public.leagues(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leagues_status ON public.leagues(status);
CREATE INDEX IF NOT EXISTS idx_leagues_invite_code ON public.leagues(invite_code);
CREATE INDEX IF NOT EXISTS idx_leagues_public ON public.leagues(is_public) WHERE is_public = true;

COMMENT ON TABLE public.leagues IS 'League instances with start/end dates and status';
COMMENT ON COLUMN public.leagues.is_active IS 'Soft delete flag - false indicates deactivated league';
COMMENT ON COLUMN public.leagues.status IS 'League lifecycle: draft → launched → active → completed';
COMMENT ON COLUMN public.leagues.invite_code IS 'Unique 8-character code for joining the league';

/**
 * activities: Master list of workout/activity types
 * Defines available activity categories (Running, Cycling, Gym, etc.)
 * Referenced by league-specific activity assignments
 */
CREATE TABLE IF NOT EXISTS public.activities (
  activity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_name varchar NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activities_name ON public.activities(activity_name);

COMMENT ON TABLE public.activities IS 'Master list of available workout/activity types';

/**
 * leagueactivities: League-specific activity configuration
 * Junction table defining which activities are allowed in each league
 * Supports exclusive leagues (only specific activities count)
 */
CREATE TABLE IF NOT EXISTS public.leagueactivities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(activity_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  CONSTRAINT unique_league_activity UNIQUE (league_id, activity_id)
);

CREATE INDEX IF NOT EXISTS idx_leagueactivities_league ON public.leagueactivities(league_id);

COMMENT ON TABLE public.leagueactivities IS 'Defines which activities are allowed in each league';

/**
 * leagueinvites: League invitation tracking
 * Records when users are invited to join a league
 * Supports invitation flow and duplicate invite prevention
 */
CREATE TABLE IF NOT EXISTS public.leagueinvites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  invited_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  CONSTRAINT unique_league_invite UNIQUE (league_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_leagueinvites_league ON public.leagueinvites(league_id);
CREATE INDEX IF NOT EXISTS idx_leagueinvites_user ON public.leagueinvites(user_id);

COMMENT ON TABLE public.leagueinvites IS 'Tracks user invitations to leagues';

-- =====================================================================================
-- TEAM MANAGEMENT
-- =====================================================================================

/**
 * teams: Team definitions
 * Represents a team entity that can participate in leagues
 * One team can participate in multiple leagues via teamleagues junction
 */
CREATE TABLE IF NOT EXISTS public.teams (
  team_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name varchar NOT NULL UNIQUE,
  invite_code varchar(12) UNIQUE,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT teams_name_length CHECK (char_length(team_name) >= 2)
);

CREATE INDEX IF NOT EXISTS idx_teams_name ON public.teams(team_name);
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON public.teams(invite_code);

COMMENT ON TABLE public.teams IS 'Team entities that participate in leagues';

/**
 * teamleagues: Team-League association
 * Junction table linking teams to leagues
 * Enables teams to participate in multiple leagues
 */
CREATE TABLE IF NOT EXISTS public.teamleagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  CONSTRAINT unique_team_league UNIQUE (team_id, league_id)
);

CREATE INDEX IF NOT EXISTS idx_teamleagues_team ON public.teamleagues(team_id);
CREATE INDEX IF NOT EXISTS idx_teamleagues_league ON public.teamleagues(league_id);

COMMENT ON TABLE public.teamleagues IS 'Junction table for team participation in leagues';

/**
 * leaguemembers: User membership in leagues with team assignment
 * Central table tracking which users are in which leagues and teams
 * Supports unassigned members (team_id NULL) before team allocation
 */
CREATE TABLE IF NOT EXISTS public.leaguemembers (
  league_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(team_id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_user_league UNIQUE (user_id, league_id)
);

CREATE INDEX IF NOT EXISTS idx_leaguemembers_user ON public.leaguemembers(user_id);
CREATE INDEX IF NOT EXISTS idx_leaguemembers_league ON public.leaguemembers(league_id);
CREATE INDEX IF NOT EXISTS idx_leaguemembers_team ON public.leaguemembers(team_id);
CREATE INDEX IF NOT EXISTS idx_leaguemembers_unassigned ON public.leaguemembers(league_id) WHERE team_id IS NULL;

COMMENT ON TABLE public.leaguemembers IS 'User membership in leagues with optional team assignment';
COMMENT ON COLUMN public.leaguemembers.team_id IS 'NULL indicates user is in allocation bucket awaiting team assignment';

/**
 * assignedrolesforleague: User role assignments per league
 * Implements multi-role support - users can have multiple roles in same league
 * Examples: Host+Player, Governor+Player, Captain+Player
 */
CREATE TABLE IF NOT EXISTS public.assignedrolesforleague (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  CONSTRAINT unique_league_user_role UNIQUE (league_id, user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_assignedrolesforleague_league ON public.assignedrolesforleague(league_id);
CREATE INDEX IF NOT EXISTS idx_assignedrolesforleague_user ON public.assignedrolesforleague(user_id);
CREATE INDEX IF NOT EXISTS idx_assignedrolesforleague_role ON public.assignedrolesforleague(role_id);

COMMENT ON TABLE public.assignedrolesforleague IS 'Multi-role assignments for users within specific leagues';

/**
 * teammembers: Team membership with roles
 * Tracks which users belong to which teams with their team-level role
 * Separate from league-level roles in assignedrolesforleague
 */
CREATE TABLE IF NOT EXISTS public.teammembers (
  team_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(role_id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_team_user UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_teammembers_team ON public.teammembers(team_id);
CREATE INDEX IF NOT EXISTS idx_teammembers_user ON public.teammembers(user_id);

COMMENT ON TABLE public.teammembers IS 'Team membership with team-level role assignments';

-- =====================================================================================
-- WORKOUT SUBMISSIONS & VALIDATION
-- =====================================================================================

/**
 * effortentry: Workout submission records
 * Core table for daily workout entries with proof and validation status
 * Supports various activity types with flexible metric tracking
 */
CREATE TABLE IF NOT EXISTS public.effortentry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  date date NOT NULL,
  type varchar NOT NULL,
  workout_type varchar,
  duration integer,
  distance numeric,
  steps integer,
  holes integer,
  rr_value numeric,
  status effort_status DEFAULT 'pending',
  proof_url varchar,
  notes text,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT effortentry_duration_positive CHECK (duration IS NULL OR duration > 0),
  CONSTRAINT effortentry_distance_positive CHECK (distance IS NULL OR distance > 0),
  CONSTRAINT effortentry_steps_positive CHECK (steps IS NULL OR steps > 0)
);

CREATE INDEX IF NOT EXISTS idx_effortentry_member ON public.effortentry(league_member_id);
CREATE INDEX IF NOT EXISTS idx_effortentry_date ON public.effortentry(date);
CREATE INDEX IF NOT EXISTS idx_effortentry_status ON public.effortentry(status);
CREATE INDEX IF NOT EXISTS idx_effortentry_member_date ON public.effortentry(league_member_id, date);

COMMENT ON TABLE public.effortentry IS 'Workout submission entries with proof and validation status';
COMMENT ON COLUMN public.effortentry.status IS 'Validation state: pending → captain review → approved/rejected';
COMMENT ON COLUMN public.effortentry.proof_url IS 'Supabase Storage URL for image/video proof';

-- =====================================================================================
-- CHALLENGES & SPECIAL EVENTS
-- =====================================================================================

/**
 * specialchallenges: Weekly challenge definitions
 * Defines special challenges like Bingo, Max Steps, Unique Day, etc.
 * Challenges run for specific date ranges within a league
 */
CREATE TABLE IF NOT EXISTS public.specialchallenges (
  challenge_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  name varchar NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  doc_url varchar,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT specialchallenges_date_order CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_specialchallenges_league ON public.specialchallenges(league_id);
CREATE INDEX IF NOT EXISTS idx_specialchallenges_dates ON public.specialchallenges(start_date, end_date);

COMMENT ON TABLE public.specialchallenges IS 'Weekly challenges like Bingo, Max Steps, Unique Day';
COMMENT ON COLUMN public.specialchallenges.doc_url IS 'Link to challenge rules/documentation';

/**
 * leagueschallenges: League-challenge association
 * Junction table linking challenges to leagues
 * Enables reusable challenge templates across leagues
 */
CREATE TABLE IF NOT EXISTS public.leagueschallenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.specialchallenges(challenge_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,

  CONSTRAINT unique_league_challenge UNIQUE (league_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_leagueschallenges_league ON public.leagueschallenges(league_id);

COMMENT ON TABLE public.leagueschallenges IS 'Association between leagues and challenges';

/**
 * specialchallengeindividualuserscore: Individual challenge scores
 * Tracks individual player performance in special challenges
 * Used for challenge-specific leaderboards
 */
CREATE TABLE IF NOT EXISTS public.specialchallengeindividualuserscore (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.specialchallenges(challenge_id) ON DELETE CASCADE,
  league_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  league_id uuid REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  score numeric DEFAULT 0,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_challenge_member UNIQUE (challenge_id, league_member_id)
);

CREATE INDEX IF NOT EXISTS idx_specialchallenge_individual_challenge ON public.specialchallengeindividualuserscore(challenge_id);
CREATE INDEX IF NOT EXISTS idx_specialchallenge_individual_member ON public.specialchallengeindividualuserscore(league_member_id);
CREATE INDEX IF NOT EXISTS idx_specialchallenge_individual_score ON public.specialchallengeindividualuserscore(score DESC);

COMMENT ON TABLE public.specialchallengeindividualuserscore IS 'Individual player scores for special challenges';

/**
 * specialchallengeteamscore: Team challenge scores
 * Aggregated team performance in special challenges
 * Used for team-based challenge leaderboards
 */
CREATE TABLE IF NOT EXISTS public.specialchallengeteamscore (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.specialchallenges(challenge_id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  league_id uuid NOT NULL REFERENCES public.leagues(league_id) ON DELETE CASCADE,
  score numeric DEFAULT 0,
  created_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  created_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  modified_by uuid REFERENCES public.users(user_id) ON DELETE SET NULL,
  modified_date timestamptz DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT unique_challenge_team UNIQUE (challenge_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_specialchallenge_team_challenge ON public.specialchallengeteamscore(challenge_id);
CREATE INDEX IF NOT EXISTS idx_specialchallenge_team_team ON public.specialchallengeteamscore(team_id);
CREATE INDEX IF NOT EXISTS idx_specialchallenge_team_score ON public.specialchallengeteamscore(score DESC);

COMMENT ON TABLE public.specialchallengeteamscore IS 'Team aggregate scores for special challenges';

-- =====================================================================================
-- PAYMENTS & TRANSACTIONS
-- =====================================================================================

/**
 * payment_status: Represents the state of a payment transaction
 * - pending: Payment initiated, awaiting completion
 * - completed: Payment successful
 * - failed: Payment failed or declined
 * - refunded: Payment was refunded
 */
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

/**
 * payment_purpose: What the payment is for
 * - league_creation: Payment for creating a new league
 * - subscription: Subscription/recurring payment
 * - other: Other payment types
 */
CREATE TYPE payment_purpose AS ENUM ('league_creation', 'subscription', 'other');

/**
 * payments: Payment transaction records
 * Tracks all payments made through Razorpay for leagues, subscriptions, etc.
 * Supports: user payment history, admin revenue dashboards, filtering, sorting
 */
CREATE TABLE IF NOT EXISTS public.payments (
  payment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who paid
  user_id uuid NOT NULL REFERENCES public.users(user_id) ON DELETE SET NULL,

  -- What they paid for (optional link to specific entities)
  league_id uuid REFERENCES public.leagues(league_id) ON DELETE SET NULL,
  purpose payment_purpose NOT NULL DEFAULT 'league_creation',

  -- Razorpay transaction details
  razorpay_order_id varchar NOT NULL UNIQUE,
  razorpay_payment_id varchar UNIQUE,
  razorpay_signature varchar,

  -- Payment status
  status payment_status NOT NULL DEFAULT 'pending',

  -- Amount breakdown (in INR, stored as numeric for precision)
  base_amount numeric NOT NULL,
  platform_fee numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'INR',

  -- Payment metadata
  description text,
  receipt varchar,
  notes jsonb,

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at timestamptz,

  -- Constraints
  CONSTRAINT payments_total_amount_positive CHECK (total_amount > 0),
  CONSTRAINT payments_base_amount_non_negative CHECK (base_amount >= 0),
  CONSTRAINT payments_platform_fee_non_negative CHECK (platform_fee >= 0),
  CONSTRAINT payments_gst_amount_non_negative CHECK (gst_amount >= 0)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payments_user ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_league ON public.payments(league_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_purpose ON public.payments(purpose);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_order ON public.payments(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON public.payments(user_id, status);

COMMENT ON TABLE public.payments IS 'Payment transaction records for league creation and subscriptions';
COMMENT ON COLUMN public.payments.razorpay_order_id IS 'Unique order ID from Razorpay';
COMMENT ON COLUMN public.payments.razorpay_payment_id IS 'Payment ID from Razorpay after successful payment';
COMMENT ON COLUMN public.payments.razorpay_signature IS 'Signature for payment verification';
COMMENT ON COLUMN public.payments.notes IS 'Additional metadata as JSON (form data, etc.)';

-- =====================================================================================
-- AUDIT & METADATA
-- =====================================================================================

COMMENT ON SCHEMA public IS 'MyFitnessLeague V2 - Team-based fitness competition platform';

-- Create updated_at trigger function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_modified_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.modified_date = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with modified_date column
CREATE TRIGGER users_modified_date BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER roles_modified_date BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER leagues_modified_date BEFORE UPDATE ON public.leagues
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER teams_modified_date BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER activities_modified_date BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER leaguemembers_modified_date BEFORE UPDATE ON public.leaguemembers
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER teammembers_modified_date BEFORE UPDATE ON public.teammembers
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER effortentry_modified_date BEFORE UPDATE ON public.effortentry
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER specialchallenges_modified_date BEFORE UPDATE ON public.specialchallenges
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER specialchallengeindividualuserscore_modified_date BEFORE UPDATE ON public.specialchallengeindividualuserscore
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

CREATE TRIGGER specialchallengeteamscore_modified_date BEFORE UPDATE ON public.specialchallengeteamscore
  FOR EACH ROW EXECUTE FUNCTION update_modified_date();

-- Create updated_at trigger function for pricing table
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pricing_updated_at BEFORE UPDATE ON public.pricing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================================
-- SEED DATA
-- =====================================================================================

/**
 * ADMIN USER SETUP
 * -----------------
 * Default admin credentials:
 * - Email: admin@myfitnessleague.com
 * - Password: Admin@123
 *
 * IMPORTANT: Change the password after first login!
 * To generate a new password hash: https://bcrypt-generator.com/ (use rounds: 10)
 */
INSERT INTO public.users (
  username,
  email,
  password_hash,
  platform_role,
  is_active,
  created_date
)
VALUES (
  'admin',
  'admin@myfitnessleague.com',
  '$2b$10$hdCr.XL7NgL/umLa1SfEiuIet1RcHi/XGqUkQ9ERwMJTTNPPf8Cxu', -- Password: Admin@123
  'admin',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;

-- Insert default roles for RBAC
INSERT INTO public.roles (role_name) VALUES
  ('host'),
  ('governor'),
  ('captain'),
  ('player')
ON CONFLICT (role_name) DO NOTHING;

-- Insert default activities
INSERT INTO public.activities (activity_name, description) VALUES
  ('Running', 'Outdoor or treadmill running'),
  ('Cycling', 'Road cycling or stationary bike'),
  ('Swimming', 'Pool or open water swimming'),
  ('Gym', 'Weight training and gym exercises'),
  ('Yoga', 'Yoga and stretching'),
  ('Walking', 'Walking or hiking'),
  ('Sports', 'Team sports like basketball, football, etc.'),
  ('Other', 'Other physical activities')
ON CONFLICT (activity_name) DO NOTHING;

-- Insert default pricing (can be updated via admin panel)
-- Base: ₹499, Platform Fee: ₹99, GST: 18%
INSERT INTO public.pricing (base_price, platform_fee, gst_percentage, is_active) VALUES
  (499, 99, 18, true)
ON CONFLICT DO NOTHING;

-- =====================================================================================
-- END OF MIGRATION
-- =====================================================================================
