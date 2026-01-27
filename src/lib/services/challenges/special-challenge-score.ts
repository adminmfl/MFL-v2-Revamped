import { getSupabaseServiceRole } from '@/lib/supabase/client';

export type ChallengeType = 'individual' | 'team' | 'sub_team';

interface SyncParams {
  leagueChallengeId: string;
  challengeId?: string | null;
  leagueId: string;
  challengeType?: ChallengeType | null;
}

interface SubmissionRow {
  league_member_id: string;
  team_id: string | null;
  awarded_points: number | null;
  leaguemembers?: { team_id: string | null }[] | { team_id: string | null } | null;
}

function buildInList(ids: string[]) {
  // PostgREST `in` filters for uuid columns expect unquoted uuid literals.
  // Quoting them produces values like "'uuid'" which fails uuid parsing.
  return ids.join(',');
}

async function upsertTeamScores(challengeId: string, leagueId: string, submissions: SubmissionRow[]) {
  const supabase = getSupabaseServiceRole();

  const totals = new Map<string, number>();
  submissions.forEach((sub) => {
    const points = Number(sub.awarded_points ?? 0);
    const teamId = sub.team_id || (Array.isArray(sub.leaguemembers) ? sub.leaguemembers[0]?.team_id : sub.leaguemembers?.team_id);
    if (!teamId || points <= 0) return;
    totals.set(teamId, (totals.get(teamId) || 0) + points);
  });

  if (totals.size === 0) {
    await supabase
      .from('specialchallengeteamscore')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('league_id', leagueId);
    return;
  }

  const rows = Array.from(totals.entries()).map(([teamId, score]) => ({
    challenge_id: challengeId,
    team_id: teamId,
    league_id: leagueId,
    score,
  }));

  const { error: upsertError } = await supabase
    .from('specialchallengeteamscore')
    .upsert(rows, { onConflict: 'challenge_id,team_id' });

  if (upsertError) {
    console.error('Failed to upsert team special challenge scores', upsertError);
    return;
  }

  const teamIds = Array.from(totals.keys());
  const inList = buildInList(teamIds);
  const { error: cleanupError } = await supabase
    .from('specialchallengeteamscore')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('league_id', leagueId)
    .not('team_id', 'in', `(${inList})`);

  if (cleanupError) {
    console.error('Failed to clean up stale team scores', cleanupError);
  }
}

async function upsertScaledIndividualScores(
  challengeId: string,
  leagueId: string,
  submissions: SubmissionRow[],
  teamSizes: Record<string, number>,
  maxTeamSize: number
) {
  const supabase = getSupabaseServiceRole();

  const totals = new Map<string, number>();
  submissions.forEach((sub) => {
    const points = Number(sub.awarded_points ?? 0);
    if (points <= 0) return;

    // Scale points: visible = awarded * (myTeamSize / maxTeamSize)
    const teamId = sub.team_id || (Array.isArray(sub.leaguemembers) ? sub.leaguemembers[0]?.team_id : sub.leaguemembers?.team_id);
    const myTeamSize = teamId ? (teamSizes[teamId] || 1) : 1;
    const scaleFactor = maxTeamSize > 0 ? myTeamSize / maxTeamSize : 1;
    const scaledPoints = Math.round(points * scaleFactor);

    totals.set(sub.league_member_id, (totals.get(sub.league_member_id) || 0) + scaledPoints);
  });

  if (totals.size === 0) {
    await supabase
      .from('specialchallengeindividualuserscore')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('league_id', leagueId);
    return;
  }

  const rows = Array.from(totals.entries()).map(([leagueMemberId, score]) => ({
    challenge_id: challengeId,
    league_member_id: leagueMemberId,
    league_id: leagueId,
    score,
  }));

  const { error: upsertError } = await supabase
    .from('specialchallengeindividualuserscore')
    .upsert(rows, { onConflict: 'challenge_id,league_member_id' });

  if (upsertError) {
    console.error('Failed to upsert scaled individual special challenge scores', upsertError);
    return;
  }

  const memberIds = Array.from(totals.keys());
  const inList = buildInList(memberIds);
  const { error: cleanupError } = await supabase
    .from('specialchallengeindividualuserscore')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('league_id', leagueId)
    .not('league_member_id', 'in', `(${inList})`);

  if (cleanupError) {
    console.error('Failed to clean up stale individual scores', cleanupError);
  }
}

async function upsertIndividualScores(challengeId: string, leagueId: string, submissions: SubmissionRow[]) {
  const supabase = getSupabaseServiceRole();

  const totals = new Map<string, number>();
  submissions.forEach((sub) => {
    const points = Number(sub.awarded_points ?? 0);
    if (points <= 0) return;
    totals.set(sub.league_member_id, (totals.get(sub.league_member_id) || 0) + points);
  });

  if (totals.size === 0) {
    await supabase
      .from('specialchallengeindividualuserscore')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('league_id', leagueId);
    return;
  }

  const rows = Array.from(totals.entries()).map(([leagueMemberId, score]) => ({
    challenge_id: challengeId,
    league_member_id: leagueMemberId,
    league_id: leagueId,
    score,
  }));

  const { error: upsertError } = await supabase
    .from('specialchallengeindividualuserscore')
    .upsert(rows, { onConflict: 'challenge_id,league_member_id' });

  if (upsertError) {
    console.error('Failed to upsert individual special challenge scores', upsertError);
    return;
  }

  const memberIds = Array.from(totals.keys());
  const inList = buildInList(memberIds);
  const { error: cleanupError } = await supabase
    .from('specialchallengeindividualuserscore')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('league_id', leagueId)
    .not('league_member_id', 'in', `(${inList})`);

  if (cleanupError) {
    console.error('Failed to clean up stale individual scores', cleanupError);
  }
}

export async function syncSpecialChallengeScores({
  leagueChallengeId,
  challengeId,
  leagueId,
  challengeType,
}: SyncParams) {
  if (!challengeId) return;

  try {
    const supabase = getSupabaseServiceRole();
    const { data: submissions, error } = await supabase
      .from('challenge_submissions')
      .select('league_member_id, team_id, awarded_points, leaguemembers(team_id)')
      .eq('league_challenge_id', leagueChallengeId)
      .eq('status', 'approved');

    if (error) {
      console.error('Failed to fetch approved submissions for sync', error);
      return;
    }

    const rows = (submissions || []) as SubmissionRow[];

    // For team challenges, we need team sizes to scale individual scores fairly
    let teamSizes: Record<string, number> = {};
    let maxTeamSize = 1;

    if (challengeType === 'team' || challengeType === 'sub_team') {
      // Fetch all league members to compute team sizes
      const { data: leagueMembers, error: membersError } = await supabase
        .from('leaguemembers')
        .select('team_id')
        .eq('league_id', leagueId);

      if (!membersError && leagueMembers) {
        leagueMembers.forEach((m: any) => {
          const tid = m.team_id as string | null;
          if (!tid) return;
          teamSizes[tid] = (teamSizes[tid] || 0) + 1;
          maxTeamSize = Math.max(maxTeamSize, teamSizes[tid]);
        });
      }
    }

    // Individual challenges: direct scores to individual leaderboard
    if (challengeType === 'individual') {
      await upsertIndividualScores(challengeId, leagueId, rows);
    }

    // Team challenges: scaled scores to individual leaderboard for fairness
    if (challengeType === 'team' || challengeType === 'sub_team') {
      await upsertScaledIndividualScores(challengeId, leagueId, rows, teamSizes, maxTeamSize);
    }

    // Team scores are used for the Teams leaderboard; all challenge types roll up to teams.
    await upsertTeamScores(challengeId, leagueId, rows);
  } catch (err) {
    console.error('Unexpected error syncing special challenge scores', err);
  }
}
