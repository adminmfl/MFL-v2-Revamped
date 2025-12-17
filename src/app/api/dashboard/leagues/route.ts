import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client with service role to satisfy RLS while using NextAuth for auth
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase service configuration is missing')
  }
  return createClient(url, serviceKey)
}

type LeagueRow = {
  league_id: string
  leagues: {
    league_name?: string | null
  } | null
}

type ApiLeague = {
  league_id: string
  name: string
  description: string | null
  cover_image: string | null
}

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null
    const userId = (session?.user as any)?.id || (session?.user as any)?.user_id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServiceClient()
    const { data, error } = await supabase
      .from('leaguemembers')
      .select('league_id, leagues(league_name)')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching leagues for user', error)
      return NextResponse.json({ error: 'Failed to load leagues' }, { status: 500 })
    }

    const leagues: ApiLeague[] = (data as LeagueRow[] | null)?.map((row) => {
      const league = row.leagues || {}
      return {
        league_id: String(row.league_id),
        name: league?.league_name || 'League',
        description: null,
        cover_image: null,
      }
    }) || []

    return NextResponse.json({ leagues })
  } catch (err) {
    console.error('Unhandled error in /api/dashboard/leagues', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
