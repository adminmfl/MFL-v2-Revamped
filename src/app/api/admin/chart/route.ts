import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getRevenueChartData } from '@/lib/services/admin';

/**
 * GET /api/admin/chart
 * Get revenue chart data
 */
export async function GET(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any)?.platform_role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '90', 10);

    const chartData = await getRevenueChartData(days);
    return NextResponse.json({ data: chartData.data });
  } catch (error) {
    console.error('Error in admin chart GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
