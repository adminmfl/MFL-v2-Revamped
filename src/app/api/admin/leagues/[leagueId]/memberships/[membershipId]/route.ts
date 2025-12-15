import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { createServerClient } from '@/lib/supabase/server';

// PATCH /api/admin/leagues/[leagueId]/memberships/[membershipId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: { leagueId: string; membershipId: string } }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user: { id: string } } | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();

    // Verify user is host of THIS SPECIFIC LEAGUE
    const { data: league } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', params.leagueId)
      .single();

    const { data: leagueRole } = await supabase
      .from('assignedrolesforleague')
      .select(`
        roles:role_id (
          role_name
        )
      `)
      .eq('league_id', params.leagueId)
      .eq('user_id', session.user.id)
      .single();

    const isHost = league?.created_by === session.user.id || 
                   (leagueRole?.roles as any)?.role_name?.toLowerCase() === 'host';

    if (!isHost) {
      return NextResponse.json({ error: 'Forbidden: Only host of this league can update roles' }, { status: 403 });
    }

    const body = await request.json();
    const { role, userId } = body;

    if (!['host', 'governor', 'captain', 'player'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get role_id for the new role
    const { data: roleData } = await supabase
      .from('roles')
      .select('role_id')
      .ilike('role_name', role)
      .single();

    if (!roleData) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Update or create role assignment based on role type
    if (role === 'host' || role === 'governor') {
      // League-level role: use assignedrolesforleague
      const { data: existing } = await supabase
        .from('assignedrolesforleague')
        .select('id')
        .eq('league_id', params.leagueId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('assignedrolesforleague')
          .update({ 
            role_id: roleData.role_id,
            created_by: session.user.id 
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Error updating league role:', error);
          return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
        }
      } else {
        // Insert new
        const { error } = await supabase
          .from('assignedrolesforleague')
          .insert({
            league_id: params.leagueId,
            user_id: userId,
            role_id: roleData.role_id,
            created_by: session.user.id,
          });

        if (error) {
          console.error('Error assigning league role:', error);
          return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
        }
      }
    }
    // Note: Captain/Player roles are managed through teammembers table when users join teams

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in update membership API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/leagues/[leagueId]/memberships/[membershipId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { leagueId: string; membershipId: string } }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user: { id: string } } | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServerClient();

    // Verify user is host of THIS SPECIFIC LEAGUE
    const { data: league } = await supabase
      .from('leagues')
      .select('created_by')
      .eq('league_id', params.leagueId)
      .single();

    const { data: leagueRole } = await supabase
      .from('assignedrolesforleague')
      .select(`
        roles:role_id (
          role_name
        )
      `)
      .eq('league_id', params.leagueId)
      .eq('user_id', session.user.id)
      .single();

    const isHost = league?.created_by === session.user.id || 
                   (leagueRole?.roles as any)?.role_name?.toLowerCase() === 'host';

    if (!isHost) {
      return NextResponse.json({ error: 'Forbidden: Only host of this league can remove members' }, { status: 403 });
    }

    const { userId } = await request.json();

    // Remove user from league completely
    // 1. Remove from assignedrolesforleague
    await supabase
      .from('assignedrolesforleague')
      .delete()
      .eq('league_id', params.leagueId)
      .eq('user_id', userId);

    // 2. Remove from leaguemembers (this removes them from the league)
    const { error } = await supabase
      .from('leaguemembers')
      .delete()
      .eq('league_id', params.leagueId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing member:', error);
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
    }

    // Note: teammembers are tied to teams, not directly removed when leaving league
    // The team relationships remain but user can't access league anymore

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in delete membership API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
