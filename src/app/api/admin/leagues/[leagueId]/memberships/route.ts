import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createServerClient } from '@/lib/supabase/server';
import { Role } from '@/contexts/role-context';

// GET /api/admin/leagues/[leagueId]/memberships
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await params;
    const session = (await getServerSession(authOptions as any)) as { user: { id: string } } | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();

    // Check if user is host of THIS SPECIFIC LEAGUE
    const { data: league } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', leagueId)
      .single();

    const { data: leagueRole } = await supabase
      .from('assignedrolesforleague')
      .select(`
        role_id,
        roles:role_id (
          role_name
        )
      `)
      .eq('league_id', leagueId)
      .eq('user_id', session.user.id)
      .single();

    const isHost = league?.created_by === session.user.id || 
                   (leagueRole?.roles as any)?.role_name?.toLowerCase() === 'host';

    if (!isHost) {
      return NextResponse.json({ error: 'Forbidden: Only host of this league can manage roles' }, { status: 403 });
    }

    // Fetch all league members with their roles
    const { data: leagueMembers, error } = await supabase
      .from('leaguemembers')
      .select(`
        league_member_id,
        user_id,
        users:user_id (
          username,
          email
        )
      `)
      .eq('league_id', leagueId);

    if (error) {
      console.error('Error fetching league members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    // For each member, fetch their roles
    const memberships = [];
    for (const member of leagueMembers || []) {
      // Check league-level roles
      const { data: assignedRole } = await supabase
        .from('assignedrolesforleague')
        .select(`
          id,
          roles:role_id (
            role_name
          )
        `)
        .eq('league_id', leagueId)
        .eq('user_id', member.user_id)
        .single();

      let role = 'player'; // default
      let roleId = assignedRole?.id;

      if (assignedRole) {
        const roleName = (assignedRole.roles as any)?.role_name?.toLowerCase();
        if (roleName === 'host' || roleName === 'governor') {
          role = roleName;
        }
      }

      // Check if they're captain of any team in this league
      if (role === 'player') {
        const { data: teamMember } = await supabase
          .from('teammembers')
          .select(`
            team_member_id,
            team_id,
            roles:role_id (
              role_name
            )
          `)
          .eq('user_id', member.user_id);

        if (teamMember) {
          for (const tm of teamMember) {
            // Check if team is in this league
            const { data: teamLeague } = await supabase
              .from('teamleagues')
              .select('id')
              .eq('team_id', tm.team_id)
              .eq('league_id', leagueId)
              .single();

            if (teamLeague) {
              const tmRole = (tm.roles as any)?.role_name?.toLowerCase();
              if (tmRole === 'captain') {
                role = 'captain';
                roleId = tm.team_member_id;
                break;
              }
            }
          }
        }
      }

      memberships.push({
        id: roleId || member.league_member_id,
        user_id: member.user_id,
        username: (member.users as any)?.username,
        email: (member.users as any)?.email,
        role: role as Role,
        status: 'active',
      });
    }

    return NextResponse.json({ memberships });
  } catch (error) {
    console.error('Error in memberships API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
