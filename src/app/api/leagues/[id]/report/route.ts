/**
 * GET /api/leagues/[id]/report - Generate personalized league report PDF
 * 
 * Returns a downloadable PDF report for the authenticated user's league journey.
 * Includes caching headers for performance optimization.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getSupabaseServiceRole } from '@/lib/supabase/client';
import { getLeagueReportData } from '@/lib/services/league-report';
import { renderToBuffer } from '@react-pdf/renderer';
import { LeagueReportPDF } from '@/lib/pdf/league-report-pdf';
import React from 'react';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: leagueId } = await params;
        const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;
        const supabase = getSupabaseServiceRole();

        // Verify league exists and is completed
        const { data: league, error: leagueError } = await supabase
            .from('leagues')
            .select('league_id, status, end_date')
            .eq('league_id', leagueId)
            .single();

        if (leagueError || !league) {
            return NextResponse.json({ error: 'League not found' }, { status: 404 });
        }

        // Check if league is completed (either status is 'completed' or end_date has passed)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(league.end_date);
        endDate.setHours(0, 0, 0, 0);

        const isCompleted = league.status === 'completed' || today > endDate;

        if (!isCompleted) {
            return NextResponse.json(
                { error: 'Reports are only available for completed leagues' },
                { status: 400 }
            );
        }

        // Verify user is a member of this league
        const { data: membership, error: memberError } = await supabase
            .from('leaguemembers')
            .select('league_member_id')
            .eq('user_id', userId)
            .eq('league_id', leagueId)
            .maybeSingle();

        if (memberError || !membership) {
            return NextResponse.json(
                { error: 'You are not a member of this league' },
                { status: 403 }
            );
        }

        // Check format parameter
        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'pdf';

        // Get report data
        const reportData = await getLeagueReportData(leagueId, userId);

        if (!reportData) {
            return NextResponse.json(
                { error: 'Failed to generate report data' },
                { status: 500 }
            );
        }

        // Return JSON if requested
        if (format === 'json') {
            return NextResponse.json({
                success: true,
                data: reportData,
            });
        }

        // Generate PDF
        const pdfBuffer = await renderToBuffer(
            React.createElement(LeagueReportPDF, { data: reportData })
        );

        // Create filename
        const sanitizedLeagueName = reportData.league.name.replace(/[^a-zA-Z0-9]/g, '_');
        const sanitizedUsername = reportData.user.username.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `League_Report_${sanitizedLeagueName}_${sanitizedUsername}.pdf`;

        // Return PDF with caching headers
        return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                // Cache for 24 hours (private = only browser can cache, not CDN)
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
                // Disable server-side caching (client-side caching handled by download button)
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
            },
        });
    } catch (error) {
        console.error('Error generating league report:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
