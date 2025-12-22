-- Schema migration: Ensure sub_team_id support in challenge_submissions
-- Note: The schema already includes sub_team_id column with proper constraints
-- This migration is a no-op placeholder to document the schema state

-- The challenge_submissions table has:
-- - sub_team_id UUID column with FK to challenge_subteams(subteam_id) ON DELETE SET NULL
-- - team_id UUID column with FK to teams(team_id) ON DELETE SET NULL
-- - Indexes on both team_id and sub_team_id for query performance
-- - UNIQUE constraint on (league_challenge_id, league_member_id)

-- This allows submissions to be properly filtered by team and sub-team in the review interface
