import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { needsProfileCompletion } from '@/lib/services/users';

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const needsCompletion = await needsProfileCompletion(session.user.id);
    return NextResponse.json({ needsProfileCompletion: needsCompletion });
  } catch (err) {
    console.error('Unexpected error in refresh-profile:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
