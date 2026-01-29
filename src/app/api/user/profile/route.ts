import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { updateUserProfile } from '@/lib/services/users';
import { getSupabaseServiceRole } from '@/lib/supabase/client';

export async function GET() {
    try {
        const session = await getServerSession(authOptions as any);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = getSupabaseServiceRole();
        const { data: user, error } = await supabase
            .from('users')
            .select('user_id, username, email, phone, date_of_birth, profile_picture_url')
            .eq('user_id', userId)
            .single();

        if (error || !user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions as any);
        const userId = (session?.user as any)?.id;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, phone, profile_picture_url } = body;

        // Validate inputs
        if (!name || name.trim().length < 2) {
            return NextResponse.json(
                { error: 'Name must be at least 2 characters' },
                { status: 400 }
            );
        }

        // Use service role - NextAuth validates user at API level, RLS uses Supabase auth.uid()
        const updatedUser = await updateUserProfile(userId, {
            username: name.trim(),
            phone: phone || null,
            profile_picture_url: profile_picture_url || null,
        }, true);

        if (!updatedUser) {
            return NextResponse.json(
                { error: 'Failed to update profile' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
