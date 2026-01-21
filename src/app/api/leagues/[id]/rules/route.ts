import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth/config'
import { getSupabaseServiceRole } from '@/lib/supabase/client'
import { userHasAnyRole } from '@/lib/services/roles'
import { getLeagueById, updateLeagueRulesDocUrl, updateLeagueRulesSummary } from '@/lib/services/leagues'
import { Buffer } from 'node:buffer'

const BUCKET = process.env.NEXT_PUBLIC_LEAGUE_RULES_BUCKET || 'league-rules'
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function buildError(message: string, status = 400) {
    return NextResponse.json({ success: false, error: message }, { status })
}

function inferExtension(mime: string): string {
    if (mime === 'application/pdf') return 'pdf'
    if (mime === 'application/msword') return 'doc'
    if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx'
    return 'pdf'
}

function getFileTypeLabel(url: string | null): string {
    if (!url) return 'unknown'
    if (url.endsWith('.pdf')) return 'pdf'
    if (url.endsWith('.doc')) return 'doc'
    if (url.endsWith('.docx')) return 'docx'
    return 'document'
}

function pathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
    if (!url) return null
    const marker = `/public/${bucket}/`
    const idx = url.indexOf(marker)
    if (idx === -1) return null
    return url.substring(idx + marker.length)
}

/**
 * GET /api/leagues/[id]/rules
 * Get league rules (summary + document URL)
 */
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

    const leagueData = league as any
    return NextResponse.json({
        success: true,
        data: {
            rules_summary: leagueData.rules_summary || null,
            rules_doc_url: leagueData.rules_doc_url || null,
            file_type: getFileTypeLabel(leagueData.rules_doc_url),
        },
    })
}

/**
 * DELETE /api/leagues/[id]/rules
 * Delete league rules document (host only)
 */
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
        if (!isHost) return buildError('Only hosts can manage league rules', 403)

        const league = await getLeagueById(leagueId)
        if (!league) return buildError('League not found', 404)

        const path = pathFromPublicUrl((league as any).rules_doc_url, BUCKET)
        if (path) {
            await supabase.storage.from(BUCKET).remove([path])
        }

        await updateLeagueRulesDocUrl(leagueId, userId, null)
        return NextResponse.json({ success: true, data: { rules_doc_url: null } })
    } catch (error) {
        console.error('[League Rules] delete error', error)
        return buildError('Failed to delete rules document', 500)
    }
}

/**
 * POST /api/leagues/[id]/rules
 * Upload/update league rules document and summary (host only)
 * Form data: file (optional), rules_summary (optional)
 */
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
        if (!isHost) return buildError('Only hosts can manage league rules', 403)

        const supabase = getSupabaseServiceRole()
        const formData = await req.formData()

        const file = formData.get('file') as File | null
        const rulesSummary = formData.get('rules_summary') as string | null

        let rulesDocUrl: string | null = null

        // Handle file upload if provided
        if (file && file.size > 0) {
            if (file.size > MAX_SIZE_BYTES) return buildError('File too large (max 10MB)', 413)
            if (!ALLOWED_TYPES.includes(file.type)) {
                return buildError('Unsupported file type. Allowed: PDF, DOC, DOCX', 400)
            }

            // Delete existing file if any
            const league = await getLeagueById(leagueId)
            if (league) {
                const existingPath = pathFromPublicUrl((league as any).rules_doc_url, BUCKET)
                if (existingPath) {
                    await supabase.storage.from(BUCKET).remove([existingPath])
                }
            }

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
                console.error('[League Rules] upload error', uploadError)
                return buildError('Failed to upload rules document', 500)
            }

            const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(fileName)
            rulesDocUrl = publicData.publicUrl

            await updateLeagueRulesDocUrl(leagueId, userId, rulesDocUrl)
        }

        // Update rules summary if provided
        if (rulesSummary !== null) {
            const trimmedSummary = rulesSummary.slice(0, 250)
            await updateLeagueRulesSummary(leagueId, userId, trimmedSummary || null)
        }

        // Fetch updated league data
        const updatedLeague = await getLeagueById(leagueId)
        const leagueData = updatedLeague as any

        return NextResponse.json({
            success: true,
            data: {
                rules_summary: leagueData?.rules_summary || null,
                rules_doc_url: leagueData?.rules_doc_url || null,
                file_type: getFileTypeLabel(leagueData?.rules_doc_url),
            },
        })
    } catch (error) {
        console.error('[League Rules] upload error', error)
        return buildError('Failed to save rules', 500)
    }
}
