// src/app/api/pricing/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getPricing, updatePricing } from '@/lib/services/pricing';
import { getServerSession } from 'next-auth/next';

export async function GET() {
  try {
    const pricing = await getPricing();
    if (!pricing) {
      return NextResponse.json({ error: 'Pricing not found' }, { status: 404 });
    }
    return NextResponse.json({ pricing });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user ID - check both id and sub (depending on NextAuth config)
    const userId = (session.user as any).id || (session.user as any).sub;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    const body = await req.json();
    const pricing = await updatePricing(userId, body);
    return NextResponse.json({ pricing });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
