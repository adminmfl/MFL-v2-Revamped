-- Challenges module migration
-- Maintains separation between preset catalog (specialchallenges) and league-scoped instances (leagueschallenges)

-- 1) Extend specialchallenges (admin presets) with challenge metadata
-- Master templates: minimal metadata, no points/payment (those are league-scoped)
ALTER TABLE public.specialchallenges
  ADD COLUMN IF NOT EXISTS challenge_type varchar DEFAULT 'individual' CHECK (challenge_type IN ('individual','team','sub_team')),
  ADD COLUMN IF NOT EXISTS description text;

-- 2) Evolve leagueschallenges (league-scoped instances) instead of recreating
-- Keep existing PK (id) and links; allow custom challenges (challenge_id nullable)
ALTER TABLE public.leagueschallenges
  ALTER COLUMN challenge_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS name varchar,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS challenge_type varchar DEFAULT 'individual' CHECK (challenge_type IN ('individual','team','sub_team')),
  ADD COLUMN IF NOT EXISTS total_points numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(payment_id),
  ADD COLUMN IF NOT EXISTS doc_url varchar,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS status varchar DEFAULT 'active' CHECK (status IN ('active','upcoming','closed')),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure indexes for filtering
CREATE INDEX IF NOT EXISTS idx_leagueschallenges_challenge ON public.leagueschallenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_leagueschallenges_status ON public.leagueschallenges(status);

-- 3) Challenge submissions (one per league_member per league_challenge)
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_challenge_id uuid NOT NULL REFERENCES public.leagueschallenges(id) ON DELETE CASCADE,
  league_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  proof_url varchar NOT NULL,
  status varchar NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  awarded_points numeric,
  reviewed_by uuid REFERENCES public.users(user_id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_challenge_member UNIQUE (league_challenge_id, league_member_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_submissions_challenge ON public.challenge_submissions(league_challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_status ON public.challenge_submissions(status);
CREATE INDEX IF NOT EXISTS idx_challenge_submissions_reviewer ON public.challenge_submissions(reviewed_by);

-- RLS for challenge_submissions
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS challenge_submissions_select_own ON public.challenge_submissions;
DROP POLICY IF EXISTS challenge_submissions_insert_own ON public.challenge_submissions;
DROP POLICY IF EXISTS challenge_submissions_select_admin ON public.challenge_submissions;
DROP POLICY IF EXISTS challenge_submissions_update_admin ON public.challenge_submissions;

-- Players: select/insert only their own submissions
CREATE POLICY challenge_submissions_select_own
  ON public.challenge_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.leaguemembers lm
      WHERE lm.league_member_id = challenge_submissions.league_member_id
        AND lm.user_id = auth.uid()
    )
  );

CREATE POLICY challenge_submissions_insert_own
  ON public.challenge_submissions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leaguemembers lm
      WHERE lm.league_member_id = league_member_id
        AND lm.user_id = auth.uid()
    )
  );

-- Host/Governor: full read/update for league scope via helper function is_host_or_governor(user_id, league_challenge_id)
-- Assumes a helper that checks roles for the league of the challenge; adjust to your existing helper name/signature
CREATE POLICY challenge_submissions_select_admin
  ON public.challenge_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagueschallenges lc
      WHERE lc.id = league_challenge_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  );

CREATE POLICY challenge_submissions_update_admin
  ON public.challenge_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagueschallenges lc
      WHERE lc.id = league_challenge_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagueschallenges lc
      WHERE lc.id = league_challenge_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  );

-- 4) Sub-team support (only used when challenge_type = 'sub_team')
CREATE TABLE IF NOT EXISTS public.challenge_subteams (
  subteam_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_challenge_id uuid NOT NULL REFERENCES public.leagueschallenges(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(team_id) ON DELETE CASCADE,
  name varchar NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenge_subteams_challenge ON public.challenge_subteams(league_challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_subteams_team ON public.challenge_subteams(team_id);

-- RLS for challenge_subteams
ALTER TABLE public.challenge_subteams ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS challenge_subteams_select_admin ON public.challenge_subteams;
DROP POLICY IF EXISTS challenge_subteams_insert_admin ON public.challenge_subteams;
DROP POLICY IF EXISTS challenge_subteams_update_admin ON public.challenge_subteams;

-- Host/Governor only (no player access); assumes helper is_host_or_governor(user_id, league_challenge_id)
CREATE POLICY challenge_subteams_select_admin
  ON public.challenge_subteams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagueschallenges lc
      WHERE lc.id = league_challenge_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  );

CREATE POLICY challenge_subteams_insert_admin
  ON public.challenge_subteams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagueschallenges lc
      WHERE lc.id = league_challenge_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  );

CREATE POLICY challenge_subteams_update_admin
  ON public.challenge_subteams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.leagueschallenges lc
      WHERE lc.id = league_challenge_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.leagueschallenges lc
      WHERE lc.id = league_challenge_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  );

CREATE TABLE IF NOT EXISTS public.challenge_subteam_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subteam_id uuid NOT NULL REFERENCES public.challenge_subteams(subteam_id) ON DELETE CASCADE,
  league_member_id uuid NOT NULL REFERENCES public.leaguemembers(league_member_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_subteam_member UNIQUE (subteam_id, league_member_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_subteam_members_subteam ON public.challenge_subteam_members(subteam_id);
CREATE INDEX IF NOT EXISTS idx_challenge_subteam_members_member ON public.challenge_subteam_members(league_member_id);

-- RLS for challenge_subteam_members
ALTER TABLE public.challenge_subteam_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS challenge_subteam_members_select_admin ON public.challenge_subteam_members;
DROP POLICY IF EXISTS challenge_subteam_members_insert_admin ON public.challenge_subteam_members;
DROP POLICY IF EXISTS challenge_subteam_members_update_admin ON public.challenge_subteam_members;

-- Host/Governor only (manage subteam membership)
CREATE POLICY challenge_subteam_members_select_admin
  ON public.challenge_subteam_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.challenge_subteams st
      JOIN public.leagueschallenges lc ON lc.id = st.league_challenge_id
      WHERE st.subteam_id = challenge_subteam_members.subteam_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  );

CREATE POLICY challenge_subteam_members_insert_admin
  ON public.challenge_subteam_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.challenge_subteams st
      JOIN public.leagueschallenges lc ON lc.id = st.league_challenge_id
      WHERE st.subteam_id = subteam_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  );

CREATE POLICY challenge_subteam_members_update_admin
  ON public.challenge_subteam_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.challenge_subteams st
      JOIN public.leagueschallenges lc ON lc.id = st.league_challenge_id
      WHERE st.subteam_id = challenge_subteam_members.subteam_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.challenge_subteams st
      JOIN public.leagueschallenges lc ON lc.id = st.league_challenge_id
      WHERE st.subteam_id = challenge_subteam_members.subteam_id
        AND (is_host(auth.uid(), lc.league_id) OR is_governor(auth.uid(), lc.league_id))
    )
  );

-- Note: scoring and leaderboard aggregation stay in application/services layer; this migration only shapes storage.
