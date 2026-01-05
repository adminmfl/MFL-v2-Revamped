import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { getSupabaseServiceRole } from '@/lib/supabase/client'
import { userHasAnyRole } from '@/lib/services/roles'
import { getLeagueById, updateLeagueLogoUrl } from '@/lib/services/leagues'
import { Buffer } from 'node:buffer'

const BUCKET = process.env.NEXT_PUBLIC_LEAGUE_LOGOS_BUCKET || 'league-logos'
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

function buildError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

function inferExtension(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  return 'jpg'
}

function pathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null
  const marker = `/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.substring(idx + marker.length)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: leagueId } = await params
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null
  if (!session?.user?.id) {
    return buildError('Unauthorized', 401)
  }

  const league = await getLeagueById(leagueId)
  if (!league) return buildError('League not found', 404)

  return NextResponse.json({ success: true, data: { url: (league as any).logo_url || null } })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null
    const userId = session?.user?.id
    if (!userId) return buildError('Unauthorized', 401)

    const supabase = getSupabaseServiceRole()

    const isHost = await userHasAnyRole(userId, leagueId, ['host'])
    if (!isHost) return buildError('Only hosts can manage league logos', 403)

    const league = await getLeagueById(leagueId)
    if (!league) return buildError('League not found', 404)

    const path = pathFromPublicUrl((league as any).logo_url, BUCKET)
    if (path) {
      await supabase.storage.from(BUCKET).remove([path])
    }

    await updateLeagueLogoUrl(leagueId, userId, null)
    return NextResponse.json({ success: true, data: { url: null } })
  } catch (error) {
    console.error('[League Logo] delete error', error)
    return buildError('Failed to delete logo', 500)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null
    const userId = session?.user?.id

    if (!userId) return buildError('Unauthorized', 401)

    const isHost = await userHasAnyRole(userId, leagueId, ['host'])
    if (!isHost) return buildError('Only hosts can manage league logos', 403)

    const supabase = getSupabaseServiceRole()

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return buildError('File is required', 400)
    if (file.size > MAX_SIZE_BYTES) return buildError('File too large (max 2MB)', 413)
    if (!ALLOWED_TYPES.includes(file.type)) return buildError('Unsupported file type', 400)

    const ext = inferExtension(file.type)
    const fileName = `${leagueId}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('[League Logo] upload error', uploadError)
      return buildError('Failed to upload logo', 500)
    }

    const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
    const logoUrl = publicData.publicUrl

    await updateLeagueLogoUrl(leagueId, userId, logoUrl)

    return NextResponse.json({
      success: true,
      data: {
        url: logoUrl,
        path: fileName,
        bucket: BUCKET,
      },
    })
  } catch (error) {
    console.error('[League Logo] upload error', error)
    return buildError('Failed to upload logo', 500)
  }
}
