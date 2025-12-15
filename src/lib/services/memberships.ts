/**
 * Memberships Service Layer
 * Handles league membership, team assignments, and member queries.
 */

import { getSupabase } from '@/lib/supabase/client';

export interface LeagueMember {
  league_member_id: string;
  user_id: string;
  league_id: string;
  team_id?: string | null;
  created_by: string;
  created_date: string;
  modified_by: string;
  modified_date: string;
}

/**
 * Add a user to a league
 * @param userId - User ID to add
 * @param leagueId - League ID
 * @param teamId - Optional team ID to assign
 * @param addedBy - User ID adding the member
 * @returns Created league member or null
 */
export async function addLeagueMember(
  userId: string,
  leagueId: string,
  teamId?: string,
  addedBy?: string
): Promise<LeagueMember | null> {
  try {
    // Check if already a member
    const existing = await getSupabase()
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (existing.data) {
      console.warn('User already a member of this league');
      return existing.data as LeagueMember;
    }

    const { data, error } = await getSupabase()
      .from('leaguemembers')
      .insert({
        user_id: userId,
        league_id: leagueId,
        team_id: teamId || null,
        created_by: addedBy || userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding league member:', error);
      return null;
    }

    // Assign 'player' role by default
    await getSupabase()
      .from('assignedrolesforleague')
      .insert({
        user_id: userId,
        league_id: leagueId,
        role_id: (
          await getSupabase()
            .from('roles')
            .select('role_id')
            .eq('role_name', 'player')
            .single()
        ).data?.role_id,
        created_by: addedBy || userId,
      });

    return data as LeagueMember;
  } catch (err) {
    console.error('Error in addLeagueMember:', err);
    return null;
  }
}

/**
 * Get all members of a league
 * @param leagueId - League ID
 * @returns Array of league members
 */
export async function getLeagueMembersForLeague(leagueId: string): Promise<LeagueMember[]> {
  try {
    const { data, error } = await getSupabase()
      .from('leaguemembers')
      .select('*')
      .eq('league_id', leagueId);

    if (error) {
      console.error('Error fetching league members:', error);
      return [];
    }

    return data as LeagueMember[];
  } catch (err) {
    console.error('Error in getLeagueMembersForLeague:', err);
    return [];
  }
}

/**
 * Get all members of a specific team
 * @param teamId - Team ID
 * @returns Array of league members in the team
 */
export async function getLeagueMembersForTeam(teamId: string): Promise<LeagueMember[]> {
  try {
    const { data, error } = await getSupabase()
      .from('leaguemembers')
      .select('*')
      .eq('team_id', teamId);

    if (error) {
      console.error('Error fetching team members:', error);
      return [];
    }

    return data as LeagueMember[];
  } catch (err) {
    console.error('Error in getLeagueMembersForTeam:', err);
    return [];
  }
}

/**
 * Get a specific league member
 * @param leagueMemberId - League member ID
 * @returns League member or null
 */
export async function getLeagueMember(leagueMemberId: string): Promise<LeagueMember | null> {
  try {
    const { data, error } = await getSupabase()
      .from('leaguemembers')
      .select('*')
      .eq('league_member_id', leagueMemberId)
      .single();

    if (error) return null;
    return data as LeagueMember;
  } catch (err) {
    console.error('Error in getLeagueMember:', err);
    return null;
  }
}

/**
 * Get league member by user ID and league ID
 * @param userId - User ID
 * @param leagueId - League ID
 * @returns League member or null
 */
export async function getLeagueMemberByUserAndLeague(
  userId: string,
  leagueId: string
): Promise<LeagueMember | null> {
  try {
    const { data, error } = await getSupabase()
      .from('leaguemembers')
      .select('*')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle();

    if (error) return null;
    return data as LeagueMember;
  } catch (err) {
    console.error('Error in getLeagueMemberByUserAndLeague:', err);
    return null;
  }
}

/** Member profile with joined user/team metadata */
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

/** Fetch a single user's league membership with joined user/team metadata. Assumes a single active membership per user. */
export async function fetchMemberProfile(userId: string): Promise<MemberProfile | null> {
  const { data, error } = await getSupabase()
    .from('leaguemembers')
    .select(
      'league_member_id, team_id, league_id, role, age, gender, users(user_id, username), teams(team_name)'
    )
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
    age: typeof (data as any).age === 'number' ? (data as any).age : null,
    gender: (data as any).gender ? String((data as any).gender) : null,
  };
}

/** Fetch all members for a given team with user metadata. */
export async function fetchTeamMembers(teamId: string): Promise<MemberProfile[]> {
  const { data, error } = await getSupabase()
    .from('leaguemembers')
    .select(
      'league_member_id, user_id, team_id, league_id, role, age, gender, users(user_id, username), teams(team_name)'
    )
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

/** Fetch leagues that the given user belongs to. */
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

/**
 * Update a league member (e.g., reassign team)
 * @param leagueMemberId - League member ID
 * @param data - Partial data to update
 * @param modifiedBy - User ID making the change
 * @returns Updated league member or null
 */
export async function updateLeagueMember(
  leagueMemberId: string,
  data: Partial<LeagueMember>,
  modifiedBy: string
): Promise<LeagueMember | null> {
  try {
    const { data: updated, error } = await getSupabase()
      .from('leaguemembers')
      .update({
        ...data,
        modified_by: modifiedBy,
        modified_date: new Date().toISOString(),
      })
      .eq('league_member_id', leagueMemberId)
      .select()
      .single();

    if (error) {
      console.error('Error updating league member:', error);
      return null;
    }

    return updated as LeagueMember;
  } catch (err) {
    console.error('Error in updateLeagueMember:', err);
    return null;
  }
}

/**
 * Remove a member from a league
 * @param leagueMemberId - League member ID
 * @returns Success boolean
 */
export async function removeLeagueMember(leagueMemberId: string): Promise<boolean> {
  try {
    const { error } = await getSupabase()
      .from('leaguemembers')
      .delete()
      .eq('league_member_id', leagueMemberId);

    return !error;
  } catch (err) {
    console.error('Error in removeLeagueMember:', err);
    return false;
  }
}

/**
 * Get all leagues a user is a member of
 * @param userId - User ID
 * @returns Array of league member records
 */
export async function getUserLeagueMemberships(userId: string): Promise<LeagueMember[]> {
  try {
    const { data, error } = await getSupabase()
      .from('leaguemembers')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user memberships:', error);
      return [];
    }

    return data as LeagueMember[];
  } catch (err) {
    console.error('Error in getUserLeagueMemberships:', err);
    return [];
  }
}

/**
 * Get count of members in a league
 * @param leagueId - League ID
 * @returns Member count
 */
export async function getLeagueMemberCount(leagueId: string): Promise<number> {
  try {
    const { count, error } = await getSupabase()
      .from('leaguemembers')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId);

    return count ?? 0;
  } catch (err) {
    console.error('Error in getLeagueMemberCount:', err);
    return 0;
  }
}

/**
 * Assign a user to a team within a league (pre-launch only)
 * @param leagueMemberId - League member ID
 * @param teamId - Team ID to assign to
 * @param modifiedBy - User ID making the assignment
 * @returns Updated league member or null
 */
export async function assignTeam(
  leagueMemberId: string,
  teamId: string,
  modifiedBy: string
): Promise<LeagueMember | null> {
  return updateLeagueMember(leagueMemberId, { team_id: teamId }, modifiedBy);
}

/**
 * Unassign a user from a team
 * @param leagueMemberId - League member ID
 * @param modifiedBy - User ID making the change
 * @returns Updated league member or null
 */
export async function unassignTeam(
  leagueMemberId: string,
  modifiedBy: string
): Promise<LeagueMember | null> {
  return updateLeagueMember(leagueMemberId, { team_id: null }, modifiedBy);
}
