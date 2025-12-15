/**
 * Invites Service Layer
 * Handles league invitation operations including validation and joining.
 */

import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// Types
// ============================================================================

export interface LeagueInviteInfo {
  league_id: string;
  league_name: string;
  description: string | null;
  status: string;
  start_date: string;
  end_date: string;
  num_teams: number;
  team_size: number;
  is_public: boolean;
  member_count: number;
  max_capacity: number;
  is_full: boolean;
  can_join: boolean;
}

export interface JoinResult {
  success: boolean;
  alreadyMember?: boolean;
  leagueId?: string;
  leagueName?: string;
  error?: string;
}

// ============================================================================
// Functions
// ============================================================================

/**
 * Validate an invite code and get league information
 * This is a PUBLIC function - no auth required
 * @param code - The invite code to validate
 * @returns League info or null if invalid
 */
export async function validateInviteCode(code: string): Promise<LeagueInviteInfo | null> {
  try {
    const supabase = getSupabaseServiceRole();
    const normalizedCode = code.trim().toUpperCase();

    // Find league by invite_code
    const { data: league, error } = await supabase
      .from('leagues')
      .select('*')
      .eq('invite_code', normalizedCode)
      .single();

    if (error || !league) {
      return null;
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from('leaguemembers')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', league.league_id);

    const maxCapacity = (league.num_teams || 4) * (league.team_size || 5);
    const currentCount = memberCount || 0;
    const isFull = currentCount >= maxCapacity;
    const canJoin = league.status !== 'completed' && !isFull;

    return {
      league_id: league.league_id,
      league_name: league.league_name,
      description: league.description,
      status: league.status,
      start_date: league.start_date,
      end_date: league.end_date,
      num_teams: league.num_teams || 4,
      team_size: league.team_size || 5,
      is_public: league.is_public || false,
      member_count: currentCount,
      max_capacity: maxCapacity,
      is_full: isFull,
      can_join: canJoin,
    };
  } catch (err) {
    console.error('Error validating invite code:', err);
    return null;
  }
}

/**
 * Join a league using an invite code
 * @param userId - The user ID joining
 * @param code - The invite code
 * @returns Join result
 */
export async function joinLeagueByCode(userId: string, code: string): Promise<JoinResult> {
  try {
    const supabase = getSupabaseServiceRole();
    const normalizedCode = code.trim().toUpperCase();

    // Validate the invite code first
    const leagueInfo = await validateInviteCode(normalizedCode);
    if (!leagueInfo) {
      return { success: false, error: 'Invalid invite code' };
    }

    if (!leagueInfo.can_join) {
      if (leagueInfo.is_full) {
        return { success: false, error: 'This league is full' };
      }
      return { success: false, error: 'This league is not accepting new members' };
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('league_id', leagueInfo.league_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingMember) {
      return {
        success: true,
        alreadyMember: true,
        leagueId: leagueInfo.league_id,
        leagueName: leagueInfo.league_name,
      };
    }

    // Add user to leaguemembers (unassigned to any team)
    const { error: memberError } = await supabase
      .from('leaguemembers')
      .insert({
        user_id: userId,
        league_id: leagueInfo.league_id,
        team_id: null, // Unassigned - in allocation bucket
        created_by: userId,
      });

    if (memberError) {
      console.error('Error adding league member:', memberError);
      return { success: false, error: 'Failed to join league' };
    }

    // Assign player role
    const { data: playerRole } = await supabase
      .from('roles')
      .select('role_id')
      .eq('role_name', 'player')
      .single();

    if (playerRole) {
      await supabase
        .from('assignedrolesforleague')
        .insert({
          user_id: userId,
          league_id: leagueInfo.league_id,
          role_id: playerRole.role_id,
          created_by: userId,
        });
    }

    return {
      success: true,
      leagueId: leagueInfo.league_id,
      leagueName: leagueInfo.league_name,
    };
  } catch (err) {
    console.error('Error joining league by code:', err);
    return { success: false, error: 'Failed to join league' };
  }
}

/**
 * Get the invite link for a league
 * @param leagueId - The league ID
 * @param baseUrl - The base URL of the application
 * @returns The invite link
 */
export function getInviteLink(inviteCode: string, baseUrl: string): string {
  return `${baseUrl}/invite/${inviteCode}`;
}

/**
 * Check if a user is a member of a league
 * @param userId - The user ID
 * @param leagueId - The league ID
 * @returns True if member
 */
export async function isLeagueMember(userId: string, leagueId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseServiceRole();
    const { data } = await supabase
      .from('leaguemembers')
      .select('league_member_id')
      .eq('user_id', userId)
      .eq('league_id', leagueId)
      .maybeSingle();

    return !!data;
  } catch (err) {
    console.error('Error checking league membership:', err);
    return false;
  }
}
