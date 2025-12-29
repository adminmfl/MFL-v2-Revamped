import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// GET /api/user/leagues
// ============================================================================

/**
 * Fetches all leagues for the current user with their roles in each league.
 *
 * Returns:
 * - league_id, name, description, cover_image, status
 * - roles: Array of role names the user has in this league
 * - team_id, team_name: The user's team in this league (if any)
 * - is_host: Boolean indicating if user is the league host
 */
export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    const userId = (session?.user as any)?.id || (session?.user as any)?.user_id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseServiceRole();

    // Get all league memberships for the user.
    // NOTE: We intentionally avoid embedded joins here because some DBs no longer have
    // `leagues.team_size`, and embedded relation queries may still reference it.
    const { data: memberships, error: membershipError } = await supabase
      .from('leaguemembers')
      .select('league_id, team_id')
      .eq('user_id', userId);

    if (membershipError) {
      console.error('Error fetching memberships:', membershipError);
      return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 });
    }

    const leagueIds = Array.from(
      new Set((memberships || []).map((m: any) => m.league_id).filter(Boolean))
    );
    const teamIds = Array.from(
      new Set((memberships || []).map((m: any) => m.team_id).filter(Boolean))
    );

    // Early return if no memberships
    if (leagueIds.length === 0) {
      return NextResponse.json({ leagues: [] });
    }

    // Fetch leagues WITHOUT embedded tier join (avoids FK issues)
    const { data: leaguesData, error: leaguesError } = await supabase
      .from('leagues')
      .select(
        'league_id, league_name, description, status, start_date, end_date, num_teams, tier_id, is_public, is_exclusive, invite_code, created_by'
      )
      .in('league_id', leagueIds);

    if (leaguesError) {
      console.error('Error fetching leagues:', leaguesError);
      return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 });
    }

    // Fetch tier capacities separately
    const tierIds = Array.from(
      new Set((leaguesData || []).map((l: any) => l.tier_id).filter(Boolean))
    );
    
    let tierCapacityMap = new Map<string, number>();
    if (tierIds.length > 0) {
      const { data: tiersData } = await supabase
        .from('league_tiers')
        .select('tier_id, league_capacity')
        .in('tier_id', tierIds);
      
      (tiersData || []).forEach((t: any) => {
        tierCapacityMap.set(t.tier_id, t.league_capacity || 20);
      });
    }

    let teamsData: any[] = [];
    if (teamIds.length > 0) {
      const { data, error: teamsError } = await supabase
        .from('teams')
        .select('team_id, team_name')
        .in('team_id', teamIds);

      if (teamsError) {
        console.error('Error fetching teams:', teamsError);
        return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 });
      }
      teamsData = data || [];
    }

    const leagueById = new Map((leaguesData || []).map((l: any) => [l.league_id, l] as const));
    const teamById = new Map(teamsData.map((t: any) => [t.team_id, t] as const));

    // Get all role assignments for the user
    const { data: roleAssignments, error: roleError } = await supabase
      .from('assignedrolesforleague')
      .select(`
        league_id,
        roles (
          role_name
        )
      `)
      .eq('user_id', userId);

    if (roleError) {
      console.error('Error fetching roles:', roleError);
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
    }

    // Build a map of league_id -> roles[]
    const rolesMap = new Map<string, string[]>();
    (roleAssignments || []).forEach((assignment: any) => {
      const leagueId = assignment.league_id;
      const roleName = assignment.roles?.role_name;
      if (leagueId && roleName) {
        if (!rolesMap.has(leagueId)) {
          rolesMap.set(leagueId, []);
        }
        rolesMap.get(leagueId)!.push(roleName);
      }
    });

    // Build the response
    const leagues = (memberships || []).map((membership: any) => {
      const leagueId = membership.league_id;
      const league = leagueById.get(leagueId);
      const team = membership.team_id ? teamById.get(membership.team_id) : null;
      const roles = rolesMap.get(leagueId) || [];

      // Check if user is host (created the league or has host role)
      const isHost = league?.created_by === userId || roles.includes('host');

      // If user has no explicit roles but is a member, they're at least a player
      if (roles.length === 0) {
        roles.push('player');
      }

      // Get league_capacity from tier map
      const leagueCapacity = league?.tier_id ? (tierCapacityMap.get(league.tier_id) || 20) : 20;

      // Derive a UI-friendly status based on start/end dates and stored status
      const parseYmd = (ymd?: string | null): Date | null => {
        if (!ymd) return null;
        const m = /^\d{4}-\d{2}-\d{2}$/.exec(String(ymd));
        if (!m) return null;
        const [y, mo, d] = String(ymd).split('-').map((p) => Number(p));
        if (!y || !mo || !d) return null;
        const dt = new Date(y, mo - 1, d);
        dt.setHours(0, 0, 0, 0);
        return isNaN(dt.getTime()) ? null : dt;
      };

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDt = parseYmd(league?.start_date || null);
      const endDt = parseYmd(league?.end_date || null);

      let derivedStatus = String(league?.status || 'draft').toLowerCase();
      if (derivedStatus !== 'draft') {
        if (startDt && endDt) {
          if (today.getTime() > endDt.getTime()) {
            derivedStatus = 'completed';
          } else if (today.getTime() >= startDt.getTime() && today.getTime() <= endDt.getTime()) {
            derivedStatus = 'active';
          } else if (today.getTime() < startDt.getTime()) {
            if (derivedStatus === 'scheduled' || derivedStatus === 'payment_pending') derivedStatus = 'launched';
          }
        } else if (endDt && today.getTime() > endDt.getTime()) {
          derivedStatus = 'completed';
        }
      }

      // Normalize to UI set
      if (!['draft', 'launched', 'active', 'completed'].includes(derivedStatus)) {
        if (derivedStatus === 'scheduled') derivedStatus = 'launched';
        else if (derivedStatus === 'ended') derivedStatus = 'completed';
      }

      return {
        league_id: leagueId,
        name: league?.league_name || 'Unknown League',
        description: league?.description || null,
        status: derivedStatus,
        start_date: league?.start_date || null,
        end_date: league?.end_date || null,
        num_teams: league?.num_teams || 4,
        league_capacity: leagueCapacity,
        is_public: league?.is_public || false,
        is_exclusive: league?.is_exclusive || true,
        invite_code: league?.invite_code || null,
        roles: roles,
        team_id: team?.team_id || membership.team_id || null,
        team_name: team?.team_name || null,
        is_host: isHost,
      };
    });

    // Remove duplicates (user might have multiple entries)
    const uniqueLeagues = Array.from(
      new Map(leagues.map((l: any) => [l.league_id, l])).values()
    );

    return NextResponse.json({ leagues: uniqueLeagues });
  } catch (err) {
    console.error('Error in /api/user/leagues:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
