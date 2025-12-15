import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getLeaguesForUser } from '@/lib/services/leagues'

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null
    const userId = (session?.user as any)?.id || (session?.user as any)?.user_id
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const leagues = await getLeaguesForUser(userId)

    return NextResponse.json({
      leagues: leagues.map(league => ({
        league_id: league.league_id,
        name: league.league_name,
        description: null,
        cover_image: null,
      }))
    })
  } catch (err) {
    console.error('Error fetching leagues:', err)
    return NextResponse.json({ error: 'Failed to fetch leagues' }, { status: 500 })
  }
}
