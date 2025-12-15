/**
 * Teams Service - Team data operations
 * Handles team queries, member lookups, and team metadata
 */
import { getSupabase } from '@/lib/supabase/client';

export interface Team {
  team_id: string;
  team_name: string;
  league_id: string;
  avatar_url?: string;
  captain_id?: string;
}

export interface TeamMember {
  user_id: string;
  team_id: string;
  league_id: string;
  joined_at?: string;
}

/**
 * Get team name for user (single optimized query)
 * Returns null if user not on a team
 */
export async function getTeamNameForUser(userId: string): Promise<string | null> {
  try {
    // Single query: leaguemembers joined to teams
    const { data, error } = await getSupabase()
      .from('leaguemembers')
      .select('teams(team_name)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return null;

    const teamName = (data as any)?.teams?.team_name;
    return teamName || null;
  } catch (err) {
    console.error('Error fetching team name for user:', err);
    return null;
  }
}

/**
 * Get team by ID with member count
 */
export async function getTeamById(teamId: string): Promise<Team | null> {
  try {
    const { data, error } = await getSupabase()
      .from('teams')
      .select('*')
      .eq('team_id', teamId)
      .single();

    if (error || !data) return null;
    return data as Team;
  } catch (err) {
    console.error('Error fetching team by ID:', err);
    return null;
  }
}

/**
 * Get team members with user details
 */
export async function getTeamMembersWithDetails(teamId: string): Promise<
  Array<TeamMember & { username?: string; email?: string }>
> {
  try {
    const { data, error } = await getSupabase()
      .from('leaguemembers')
      .select('user_id, team_id, league_id, joined_at, users(username, email)')
      .eq('team_id', teamId);

    if (error || !data) return [];
    return data as Array<TeamMember & { username?: string; email?: string }>;
  } catch (err) {
    console.error('Error fetching team members:', err);
    return [];
  }
}

/**
 * Get team for league
 */
export async function getTeamForLeague(
  leagueId: string,
  teamId: string
): Promise<Team | null> {
  try {
    const { data, error } = await getSupabase()
      .from('teams')
      .select('*')
      .eq('team_id', teamId)
      .eq('league_id', leagueId)
      .single();

    if (error || !data) return null;
    return data as Team;
  } catch (err) {
    console.error('Error fetching team for league:', err);
    return null;
  }
}

/**
 * Update team info
 */
export async function updateTeam(
  teamId: string,
  updates: Partial<Team>
): Promise<Team | null> {
  try {
    const { data, error } = await getSupabase()
      .from('teams')
      .update(updates)
      .eq('team_id', teamId)
      .select()
      .single();

    if (error || !data) return null;
    return data as Team;
  } catch (err) {
    console.error('Error updating team:', err);
    return null;
  }
}

/**
 * Create team
 */
export async function createTeam(
  leagueId: string,
  teamName: string,
  captainId?: string,
  avatarUrl?: string
): Promise<Team | null> {
  try {
    const { data, error } = await getSupabase()
      .from('teams')
      .insert([
        {
          league_id: leagueId,
          team_name: teamName,
          captain_id: captainId,
          avatar_url: avatarUrl,
        },
      ])
      .select()
      .single();

    if (error || !data) return null;
    return data as Team;
  } catch (err) {
    console.error('Error creating team:', err);
    return null;
  }
}

/**
 * Delete team
 */
export async function deleteTeam(teamId: string): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .from('teams')
      .delete()
      .eq('team_id', teamId);

    return !error;
  } catch (err) {
    console.error('Error deleting team:', err);
    return false;
  }
}
