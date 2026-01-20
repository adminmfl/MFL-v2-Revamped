/**
 * POST /api/upload/donation-proof - Upload donation proof image to Supabase Storage
 *
 * Uploads rest day donation proof images to the 'donation-proofs' bucket.
 * Returns the public URL for the uploaded file.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

// ============================================================================
// POST Handler
// ============================================================================

const DONATION_PROOF_BUCKET = process.env.NEXT_PUBLIC_DONATION_PROOF_BUCKET || 'donation-proofs';

export async function POST(req: NextRequest) {
    try {
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const supabase = getSupabaseServiceRole();

        // Get file from form data
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const leagueId = formData.get('league_id') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!leagueId) {
            return NextResponse.json({ error: 'league_id is required' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP, PDF' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 10MB' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const fileName = `${leagueId}/${userId}/${timestamp}.${extension}`;

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(DONATION_PROOF_BUCKET)
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return NextResponse.json(
                { error: 'Failed to upload file: ' + uploadError.message },
                { status: 500 }
            );
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(DONATION_PROOF_BUCKET)
            .getPublicUrl(fileName);

        return NextResponse.json({
            success: true,
            data: {
                url: urlData.publicUrl,
                path: fileName,
            },
        });
    } catch (error) {
        console.error('Error in upload/donation-proof:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
