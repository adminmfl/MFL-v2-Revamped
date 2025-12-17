import { getSupabase } from './supabase/client';

export type MemberProfile = {
  userId: string;
  leagueMemberId: string;
  leagueId: string | null;
  teamId: string | null;
  teamName: string | null;
  role: string | null;
  username: string | null;
  age: number | null;
  gender: string | null;
};

// Fetch a single user's league membership with joined user/team metadata.
// Assumes a single active league membership per user for now.
export async function fetchMemberProfile(userId: string): Promise<MemberProfile | null> {
  const { data, error } = await getSupabase()
    .from('leaguemembers')
    .select('league_member_id, team_id, league_id, role, age, gender, users(user_id, username), teams(team_name)')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const user = (data as any).users || {};
  const team = (data as any).teams || {};

  return {
    userId,
    leagueMemberId: String((data as any).league_member_id),
    leagueId: data.league_id ? String(data.league_id) : null,
    teamId: data.team_id ? String(data.team_id) : null,
    teamName: team?.team_name ? String(team.team_name) : null,
    role: data.role ? String(data.role) : null,
    username: user?.username ?? null,
    age: typeof data.age === 'number' ? data.age : null,
    gender: data.gender ? String(data.gender) : null,
  };
}

// Fetch all members for a given team with user metadata.
export async function fetchTeamMembers(teamId: string): Promise<MemberProfile[]> {
  const { data, error } = await getSupabase()
    .from('leaguemembers')
    .select('league_member_id, user_id, team_id, league_id, role, age, gender, users(user_id, username), teams(team_name)')
    .eq('team_id', teamId);

  if (error || !data) return [];

  return (data as any[]).map((row) => {
    const user = (row as any).users || {};
    const team = (row as any).teams || {};
    return {
      userId: String(row.user_id),
      leagueMemberId: String(row.league_member_id),
      leagueId: row.league_id ? String(row.league_id) : null,
      teamId: row.team_id ? String(row.team_id) : null,
      teamName: team?.team_name ? String(team.team_name) : null,
      role: row.role ? String(row.role) : null,
      username: user?.username ?? null,
      age: typeof row.age === 'number' ? row.age : null,
      gender: row.gender ? String(row.gender) : null,
    } as MemberProfile;
  });
}

export type LeagueInfo = {
  league_id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
};

// Fetch leagues that the given user belongs to
export async function fetchUserLeagues(userId: string): Promise<LeagueInfo[]> {
  const { data, error } = await getSupabase()
    .from('leaguemembers')
    .select('league_id, leagues(name, description, cover_image)')
    .eq('user_id', userId);

  if (error || !data) return [];

  return (data as any[]).map((row) => {
    const league = (row as any).leagues || {};
    return {
      league_id: String(row.league_id),
      name: league?.name ? String(league.name) : 'League',
      description: league?.description ? String(league.description) : null,
      cover_image: league?.cover_image ? String(league.cover_image) : null,
    } as LeagueInfo;
  });
}
