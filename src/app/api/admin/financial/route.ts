import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { getFinancialStats } from '@/lib/services/admin';

/**
 * GET /api/admin/financial
 * Get financial statistics
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

    const stats = await getFinancialStats();
    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Error in admin financial GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
