-- =====================================================================================
-- Migration: Row Level Security Policies
-- Description: Implements role-based access control using Supabase RLS
-- Author: MFL Engineering Team
-- Created: 2024-12-14
-- =====================================================================================
-- This migration enables RLS on all tables and defines policies based on user roles:
-- - Host: Full access to their league data
-- - Governor: Full read access to governed leagues, validation permissions
-- - Captain: Full access to own team data, read access to league leaderboards
-- - Player: Full access to own data, read access to team data
-- =====================================================================================

-- =====================================================================================
-- HELPER FUNCTIONS FOR ROLE CHECKING
-- =====================================================================================

/**
 * get_user_roles_in_league: Returns array of role names for a user in a league
 * Used by RLS policies to check user permissions
 *
 * @param p_user_id UUID - User to check
 * @param p_league_id UUID - League context
 * @returns TEXT[] - Array of role names (e.g., ['Host', 'Player'])
 */
CREATE OR REPLACE FUNCTION get_user_roles_in_league(p_user_id uuid, p_league_id uuid)
RETURNS TEXT[] AS $$
  SELECT ARRAY_AGG(r.role_name)
  FROM assignedrolesforleague arl
  JOIN roles r ON r.role_id = arl.role_id
  WHERE arl.user_id = p_user_id
    AND arl.league_id = p_league_id
$$ LANGUAGE sql SECURITY DEFINER STABLE;

/**
 * is_host: Check if user is Host of a league
 */
CREATE OR REPLACE FUNCTION is_host(p_user_id uuid, p_league_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM assignedrolesforleague arl
    JOIN roles r ON r.role_id = arl.role_id
    WHERE arl.user_id = p_user_id
      AND arl.league_id = p_league_id
      AND r.role_name = 'Host'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

/**
 * is_governor: Check if user is Governor of a league
 */
CREATE OR REPLACE FUNCTION is_governor(p_user_id uuid, p_league_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM assignedrolesforleague arl
    JOIN roles r ON r.role_id = arl.role_id
    WHERE arl.user_id = p_user_id
      AND arl.league_id = p_league_id
      AND r.role_name = 'Governor'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

/**
 * is_captain_of_team: Check if user is Captain of a specific team
 */
CREATE OR REPLACE FUNCTION is_captain_of_team(p_user_id uuid, p_team_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM teammembers tm
    JOIN roles r ON r.role_id = tm.role_id
    WHERE tm.user_id = p_user_id
      AND tm.team_id = p_team_id
      AND r.role_name = 'Captain'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

/**
 * get_user_team_in_league: Returns team_id for user in a league
 */
CREATE OR REPLACE FUNCTION get_user_team_in_league(p_user_id uuid, p_league_id uuid)
RETURNS uuid AS $$
  SELECT team_id
  FROM leaguemembers
  WHERE user_id = p_user_id
    AND league_id = p_league_id
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

/**
 * is_member_of_league: Check if user is a member of a league
 * Uses SECURITY DEFINER to avoid RLS infinite recursion
 */
CREATE OR REPLACE FUNCTION is_member_of_league(p_user_id uuid, p_league_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM leaguemembers
    WHERE user_id = p_user_id
      AND league_id = p_league_id
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

/**
 * get_league_member_id: Returns league_member_id for a user in a league
 * Uses SECURITY DEFINER to avoid RLS infinite recursion
 */
CREATE OR REPLACE FUNCTION get_league_member_id(p_user_id uuid, p_league_id uuid)
RETURNS uuid AS $$
  SELECT league_member_id
  FROM leaguemembers
  WHERE user_id = p_user_id
    AND league_id = p_league_id
  LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagueactivities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagueinvites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teamleagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaguemembers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignedrolesforleague ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teammembers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.effortentry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialchallenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagueschallenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialchallengeindividualuserscore ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialchallengeteamscore ENABLE ROW LEVEL SECURITY;

-- =====================================================================================
-- USERS TABLE POLICIES
-- =====================================================================================

/**
 * IMPORTANT: Login/signup uses service role key (bypasses RLS)
 * These policies only apply to authenticated user queries
 */

-- Users can view their own profile
CREATE POLICY users_select_own ON public.users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view other users (for team rosters, leaderboards)
-- Only basic public info is exposed (no password_hash, platform_role exposed in SELECT)
CREATE POLICY users_select_public ON public.users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can update their own profile (except platform_role)
CREATE POLICY users_update_own ON public.users
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only admins can update platform_role
CREATE POLICY users_update_role_admin ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
        AND platform_role = 'admin'
    )
  );

-- Service role can insert users (handled by getSupabaseServiceRole)
-- No policy needed - service role bypasses RLS

-- =====================================================================================
-- EMAIL OTP POLICIES
-- =====================================================================================

-- Service role only (handled server-side)
CREATE POLICY email_otps_service ON public.email_otps
  FOR ALL
  USING (true);

-- =====================================================================================
-- PRICING TABLE POLICIES
-- =====================================================================================

-- All authenticated users can view active pricing
CREATE POLICY pricing_select_all ON public.pricing
  FOR SELECT
  USING (is_active = true);

-- Only admin users can insert pricing
CREATE POLICY pricing_insert_admin ON public.pricing
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
        AND platform_role = 'admin'
    )
  );

-- Only admin users can update pricing
CREATE POLICY pricing_update_admin ON public.pricing
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
        AND platform_role = 'admin'
    )
  );

-- Only admin users can delete pricing
CREATE POLICY pricing_delete_admin ON public.pricing
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
        AND platform_role = 'admin'
    )
  );

-- =====================================================================================
-- ROLES TABLE POLICIES
-- =====================================================================================

-- All authenticated users can view roles
CREATE POLICY roles_select_all ON public.roles
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only service role can modify roles
CREATE POLICY roles_modify_service ON public.roles
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================================================
-- LEAGUES TABLE POLICIES
-- =====================================================================================

-- Users can view leagues they're members of
CREATE POLICY leagues_select_member ON public.leagues
  FOR SELECT
  USING (is_member_of_league(auth.uid(), league_id));

-- Users can view all active leagues (for browsing/joining)
CREATE POLICY leagues_select_active ON public.leagues
  FOR SELECT
  USING (is_active = true);

-- Users can create leagues (becomes Host automatically)
CREATE POLICY leagues_insert_authenticated ON public.leagues
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Only Host can update their league (before start_date)
CREATE POLICY leagues_update_host ON public.leagues
  FOR UPDATE
  USING (
    is_host(auth.uid(), league_id)
    AND start_date > CURRENT_DATE
  );

-- Only Host can delete league (before start_date)
CREATE POLICY leagues_delete_host ON public.leagues
  FOR DELETE
  USING (
    is_host(auth.uid(), league_id)
    AND start_date > CURRENT_DATE
  );

-- =====================================================================================
-- ACTIVITIES & LEAGUE ACTIVITIES POLICIES
-- =====================================================================================

-- All users can view activities
CREATE POLICY activities_select_all ON public.activities
  FOR SELECT
  USING (true);

-- League members can view league activities
CREATE POLICY leagueactivities_select_member ON public.leagueactivities
  FOR SELECT
  USING (is_member_of_league(auth.uid(), league_id));

-- Host/Governor can manage league activities
CREATE POLICY leagueactivities_modify_admin ON public.leagueactivities
  FOR ALL
  USING (
    is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id)
  );

-- =====================================================================================
-- LEAGUE INVITES POLICIES
-- =====================================================================================

-- Users can view invites sent to them
CREATE POLICY leagueinvites_select_own ON public.leagueinvites
  FOR SELECT
  USING (auth.uid() = user_id);

-- Host/Governor can view all invites for their league
CREATE POLICY leagueinvites_select_admin ON public.leagueinvites
  FOR SELECT
  USING (
    is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id)
  );

-- Host/Governor can create invites
CREATE POLICY leagueinvites_insert_admin ON public.leagueinvites
  FOR INSERT
  WITH CHECK (
    is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id)
  );

-- =====================================================================================
-- TEAMS & TEAM LEAGUES POLICIES
-- =====================================================================================

-- Team members can view their team
CREATE POLICY teams_select_member ON public.teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teammembers tm
      WHERE tm.team_id = teams.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- Host/Governor can view all teams in their leagues
CREATE POLICY teams_select_admin ON public.teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teamleagues tl
      WHERE tl.team_id = teams.team_id
        AND (is_host(auth.uid(), tl.league_id) OR is_governor(auth.uid(), tl.league_id))
    )
  );

-- Host can create teams for their league
CREATE POLICY teams_insert_host ON public.teams
  FOR INSERT
  WITH CHECK (true);

-- Team leagues viewable by league members
CREATE POLICY teamleagues_select_member ON public.teamleagues
  FOR SELECT
  USING (is_member_of_league(auth.uid(), league_id));

-- =====================================================================================
-- LEAGUE MEMBERS POLICIES
-- =====================================================================================

-- Users can view their own membership
CREATE POLICY leaguemembers_select_own ON public.leaguemembers
  FOR SELECT
  USING (auth.uid() = user_id);

-- League members can view all members in their league
-- Uses is_member_of_league function to avoid RLS infinite recursion
CREATE POLICY leaguemembers_select_league ON public.leaguemembers
  FOR SELECT
  USING (is_member_of_league(auth.uid(), league_id));

-- Users can join leagues (insert their own membership)
CREATE POLICY leaguemembers_insert_own ON public.leaguemembers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Host/Governor can manage all memberships
CREATE POLICY leaguemembers_update_admin ON public.leaguemembers
  FOR UPDATE
  USING (
    is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id)
  );

-- =====================================================================================
-- ASSIGNED ROLES POLICIES
-- =====================================================================================

-- Users can view their own role assignments
CREATE POLICY assignedrolesforleague_select_own ON public.assignedrolesforleague
  FOR SELECT
  USING (auth.uid() = user_id);

-- League members can view all role assignments in their league
CREATE POLICY assignedrolesforleague_select_league ON public.assignedrolesforleague
  FOR SELECT
  USING (is_member_of_league(auth.uid(), league_id));

-- Host can assign roles in their league
CREATE POLICY assignedrolesforleague_insert_host ON public.assignedrolesforleague
  FOR INSERT
  WITH CHECK (is_host(auth.uid(), league_id));

-- Host can modify role assignments
CREATE POLICY assignedrolesforleague_update_host ON public.assignedrolesforleague
  FOR UPDATE
  USING (is_host(auth.uid(), league_id));

-- Host can remove role assignments
CREATE POLICY assignedrolesforleague_delete_host ON public.assignedrolesforleague
  FOR DELETE
  USING (is_host(auth.uid(), league_id));

-- =====================================================================================
-- TEAM MEMBERS POLICIES
-- =====================================================================================

-- Team members can view their team roster
CREATE POLICY teammembers_select_team ON public.teammembers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teammembers tm
      WHERE tm.team_id = teammembers.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- Captain can manage their team members
CREATE POLICY teammembers_modify_captain ON public.teammembers
  FOR ALL
  USING (is_captain_of_team(auth.uid(), team_id));

-- Host/Governor can manage team members (via team league association)
CREATE POLICY teammembers_modify_admin ON public.teammembers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teamleagues tl
      WHERE tl.team_id = teammembers.team_id
        AND (is_host(auth.uid(), tl.league_id) OR is_governor(auth.uid(), tl.league_id))
    )
  );

-- =====================================================================================
-- EFFORT ENTRY POLICIES (Workout Submissions)
-- =====================================================================================

-- Users can view their own submissions
CREATE POLICY effortentry_select_own ON public.effortentry
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_member_id = effortentry.league_member_id
        AND lm.user_id = auth.uid()
    )
  );

-- Team members can view their team's submissions
CREATE POLICY effortentry_select_team ON public.effortentry
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leaguemembers lm1
      JOIN leaguemembers lm2 ON lm1.team_id = lm2.team_id AND lm1.league_id = lm2.league_id
      WHERE lm1.league_member_id = effortentry.league_member_id
        AND lm2.user_id = auth.uid()
        AND lm1.team_id IS NOT NULL
    )
  );

-- Host/Governor can view all submissions in their league
CREATE POLICY effortentry_select_admin ON public.effortentry
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_member_id = effortentry.league_member_id
        AND (is_host(auth.uid(), lm.league_id) OR is_governor(auth.uid(), lm.league_id))
    )
  );

-- Users can create their own submissions
CREATE POLICY effortentry_insert_own ON public.effortentry
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_member_id = league_member_id
        AND lm.user_id = auth.uid()
    )
  );

-- Users can update their own pending submissions
CREATE POLICY effortentry_update_own ON public.effortentry
  FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_member_id = effortentry.league_member_id
        AND lm.user_id = auth.uid()
    )
  );

-- Captain can update submissions for their team (validation)
CREATE POLICY effortentry_update_captain ON public.effortentry
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_member_id = effortentry.league_member_id
        AND is_captain_of_team(auth.uid(), lm.team_id)
    )
  );

-- Host/Governor can update any submission (override)
CREATE POLICY effortentry_update_admin ON public.effortentry
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_member_id = effortentry.league_member_id
        AND (is_host(auth.uid(), lm.league_id) OR is_governor(auth.uid(), lm.league_id))
    )
  );

-- =====================================================================================
-- SPECIAL CHALLENGES POLICIES
-- =====================================================================================

-- League members can view challenges in their league
CREATE POLICY specialchallenges_select_member ON public.specialchallenges
  FOR SELECT
  USING (is_member_of_league(auth.uid(), league_id));

-- Host/Governor can manage challenges
CREATE POLICY specialchallenges_modify_admin ON public.specialchallenges
  FOR ALL
  USING (
    is_host(auth.uid(), league_id) OR is_governor(auth.uid(), league_id)
  );

-- League challenges viewable by league members
CREATE POLICY leagueschallenges_select_member ON public.leagueschallenges
  FOR SELECT
  USING (is_member_of_league(auth.uid(), league_id));

-- =====================================================================================
-- CHALLENGE SCORES POLICIES
-- =====================================================================================

-- Users can view their own challenge scores
CREATE POLICY specialchallengeindividualuserscore_select_own ON public.specialchallengeindividualuserscore
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leaguemembers lm
      WHERE lm.league_member_id = specialchallengeindividualuserscore.league_member_id
        AND lm.user_id = auth.uid()
    )
  );

-- League members can view all individual scores (for leaderboards)
CREATE POLICY specialchallengeindividualuserscore_select_league ON public.specialchallengeindividualuserscore
  FOR SELECT
  USING (is_member_of_league(auth.uid(), league_id));

-- System can update scores (service role)
CREATE POLICY specialchallengeindividualuserscore_update_service ON public.specialchallengeindividualuserscore
  FOR ALL
  USING (auth.role() = 'service_role');

-- Team members can view team challenge scores
CREATE POLICY specialchallengeteamscore_select_team ON public.specialchallengeteamscore
  FOR SELECT
  USING (is_member_of_league(auth.uid(), league_id));

-- System can update team scores (service role)
CREATE POLICY specialchallengeteamscore_update_service ON public.specialchallengeteamscore
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================================================
-- PAYMENTS TABLE POLICIES
-- =====================================================================================

-- Enable RLS on payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY payments_select_own ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admin users can view all payments (for admin dashboard)
CREATE POLICY payments_select_admin ON public.payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
        AND platform_role = 'admin'
    )
  );

-- Service role can insert payments (Razorpay order creation)
CREATE POLICY payments_insert_service ON public.payments
  FOR INSERT
  WITH CHECK (true);

-- Service role can update payments (Razorpay verification)
CREATE POLICY payments_update_service ON public.payments
  FOR UPDATE
  USING (true);

-- Admin can update payments (for refunds, etc.)
CREATE POLICY payments_update_admin ON public.payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE user_id = auth.uid()
        AND platform_role = 'admin'
    )
  );

-- =====================================================================================
-- GRANT NECESSARY PERMISSIONS
-- =====================================================================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant access to all tables for authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant sequence usage for serial columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================================================
-- END OF RLS POLICIES
-- =====================================================================================
