import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { getSupabase } from '@/lib/supabase/client'

// GET - List all challenge templates
export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('specialchallenges')
      .select('*')
      .order('created_date', { ascending: false })

    if (error) {
      console.error('Error fetching challenge templates:', error)
      return NextResponse.json({ error: 'Failed to fetch challenge templates' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in challenges API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create new challenge template
export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, leagueId, startDate, endDate, docUrl } = body

    if (!name || !leagueId || !startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('specialchallenges')
      .insert({
        name,
        league_id: leagueId,
        start_date: startDate,
        end_date: endDate,
        doc_url: docUrl
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating challenge template:', error)
      return NextResponse.json({ error: 'Failed to create challenge template' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in challenges create API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update challenge template
export async function PATCH(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { id, updates } = body

    if (!id || !updates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('specialchallenges')
      .update(updates)
      .eq('challenge_id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating challenge template:', error)
      return NextResponse.json({ error: 'Failed to update challenge template' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in challenges update API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete challenge template
export async function DELETE(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any)?.role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing challenge ID' }, { status: 400 })
    }

    const supabase = getSupabase()

    const { error } = await supabase
      .from('specialchallenges')
      .delete()
      .eq('challenge_id', id)

    if (error) {
      console.error('Error deleting challenge template:', error)
      return NextResponse.json({ error: 'Failed to delete challenge template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in challenges delete API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
