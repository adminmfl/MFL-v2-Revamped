/**
 * POST /api/entries/upsert - Submit or update a workout entry
 *
 * Creates or updates an effort entry with RR value calculation.
 * Supports proof image upload via URL (image should be uploaded to storage first).
 */
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/supabase/client";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { getUserLocalDateYMD } from '@/lib/utils/timezone';

// ============================================================================
// Types
// ============================================================================

interface EntryPayload {
  league_member_id: string;
  date: string;
  type: 'workout' | 'rest';
  workout_type?: string;
  duration?: number;
  distance?: number;
  steps?: number;
  holes?: number;
  rr_value?: number;
  proof_url?: string;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_by: string;
  reupload_of?: string | null;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const supabase = getSupabaseServiceRole();

    const body = await req.json();
    const {
      league_id,
      date,
      type,
      workout_type,
      duration,
      distance,
      steps,
      holes,
      proof_url,
      notes,
      reupload_of,
      timezone_offset, // Legacy: sign-inverted offset (e.g., +330 for IST = UTC+5:30)
      tzOffsetMinutes, // Preferred: same value as `new Date().getTimezoneOffset()` (e.g., -330 for IST)
      ianaTimezone, // Preferred IANA tz (e.g., 'America/Los_Angeles')
    } = body;

    // Validate required fields
    if (!league_id) {
      return NextResponse.json({ error: "league_id is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }
      const normalizedDate = normalizeDateOnly(date);

    // Allow submissions only for today unless this is an explicit reupload of a rejected entry
    // Use user's timezone to calculate "today" correctly. We prefer friendly IANA tz strings but
    // keep backwards-compatible fallbacks to tzOffsetMinutes and legacy timezone_offset.
    const todayYmd = getUserLocalDateYMD({
      now: new Date(),
      ianaTimezone: typeof ianaTimezone === 'string' ? ianaTimezone : null,
      tzOffsetMinutes: typeof tzOffsetMinutes === 'number' && Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : null,
      legacyTimezoneOffset: typeof timezone_offset === 'number' && Number.isFinite(timezone_offset) ? timezone_offset : null,
    });

    if (!reupload_of && normalizedDate !== todayYmd) {
      return NextResponse.json(
        { error: 'You can only submit for today. Use the resubmit flow for rejected entries.' },
        { status: 400 }
      );
    }

    if (!type || !['workout', 'rest'].includes(type)) {
      return NextResponse.json({ error: "type must be 'workout' or 'rest'" }, { status: 400 });
    }

    // Get user's league membership for the specified league
    const { data: membership, error: memberError } = await supabase
      .from('leaguemembers')
      .select('league_member_id, team_id')
      .eq('user_id', userId)
      .eq('league_id', league_id)
      .maybeSingle();

    if (memberError || !membership) {
      console.error('Membership lookup error:', memberError);
      return NextResponse.json(
        { error: "You are not a member of this league" },
        { status: 403 }
      );
    }

    // Get user's age for RR calculation adjustments
    const { data: userData } = await supabase
      .from('users')
      .select('date_of_birth')
      .eq('user_id', userId)
      .single();

    let userAge: number | null = null;
    if (userData?.date_of_birth) {
      const birthDate = new Date(userData.date_of_birth);
      const today = new Date();
      userAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        userAge--;
      }
    }

    // Age-based thresholds
    let baseDuration = 45;
    let minSteps = 10000, maxSteps = 20000;
    if (typeof userAge === 'number') {
      if (userAge > 75) {
        minSteps = 3000; maxSteps = 6000;
        baseDuration = 30;
      } else if (userAge > 65) {
        minSteps = 5000; maxSteps = 10000;
        baseDuration = 30;
      }
    }

    // If this is a resubmission, ensure the original belongs to the user, is rejected, and has no approved resubmission.
    if (reupload_of) {
      const { data: original, error: originalError } = await supabase
        .from('effortentry')
        .select('id, league_member_id, status, date')
        .eq('id', reupload_of)
        .maybeSingle();

      if (originalError) {
        console.error('Original entry lookup error:', originalError);
        return NextResponse.json({ error: 'Failed to validate resubmission' }, { status: 500 });
      }
      if (!original) {
        return NextResponse.json({ error: 'Original submission not found for resubmit' }, { status: 404 });
      }
      if (original.league_member_id !== membership.league_member_id) {
        return NextResponse.json({ error: 'You can only resubmit your own rejected submissions' }, { status: 403 });
      }
      if (original.status !== 'rejected') {
        return NextResponse.json({ error: 'Only rejected submissions can be resubmitted' }, { status: 400 });
      }

      // Resubmission must keep the same date as the original
      const originalDate = normalizeDateOnly(original.date as any);
      if (originalDate && normalizedDate !== originalDate) {
        return NextResponse.json({ error: 'Resubmissions must use the original submission date' }, { status: 400 });
      }

      // Block further uploads once any resubmission was approved
      const { data: childResubs, error: childError } = await supabase
        .from('effortentry')
        .select('id, status')
        .eq('reupload_of', reupload_of)
        .eq('league_member_id', membership.league_member_id)
        .order('created_date', { ascending: false });

      if (childError) {
        console.error('Resubmission lookup error:', childError);
        return NextResponse.json({ error: 'Failed to validate resubmission history' }, { status: 500 });
      }

      const hasApprovedResub = (childResubs || []).some((row) => row.status === 'approved');
      if (hasApprovedResub) {
        return NextResponse.json({ error: 'This submission already has an approved resubmission. Further uploads are not allowed.' }, { status: 409 });
      }
    }

    // Check for existing entry on same date.
    // IMPORTANT: never use maybeSingle() here because duplicates in the database
    // will cause a "multiple rows" error and allow additional inserts.
    const { data: existingRows, error: existingError } = await supabase
      .from('effortentry')
      .select('id, type, status, proof_url, created_date')
      .eq('league_member_id', membership.league_member_id)
      .eq('date', normalizedDate)
      .order('created_date', { ascending: false });

    if (existingError) {
      console.error('Existing entry lookup error:', existingError);
      return NextResponse.json({ error: 'Failed to validate existing submissions' }, { status: 500 });
    }

    const existing = existingRows?.[0] ?? null;

    // Enforce: only one entry per day per league member.
    // Allow a "replace" only when ALL existing entries for the day are rejected.
    const hasNonRejected = (existingRows ?? []).some((r: any) => r?.status && r.status !== 'rejected');
    const canReplaceRejected = !!existing && !hasNonRejected;

    // Proof screenshot is mandatory for workout entries.
    // Allow updates without a new proof_url only if an existing proof_url is already present.
    if (type === 'workout' && !proof_url && !(canReplaceRejected && existing?.proof_url)) {
      return NextResponse.json(
        { error: 'proof_url is required for workout entries' },
        { status: 400 }
      );
    }

    // Reupload count removed from system; we only link to the original via reupload_of.

    // Build entry payload
    const payload: EntryPayload = {
      league_member_id: membership.league_member_id,
      date: normalizedDate,
      type,
      workout_type: workout_type || null,
      duration: duration || null,
      distance: distance || null,
      steps: steps || null,
      holes: holes || null,
      proof_url: proof_url || null,
      notes: notes || null,
      status: 'pending',
      created_by: userId,
      reupload_of: reupload_of || null,
    };

    // Calculate RR value based on activity type
    if (type === 'rest') {
      payload.rr_value = 1.0;
    } else if (workout_type === 'steps' && steps) {
      if (steps < minSteps) {
        payload.rr_value = 0;
      } else {
        const capped = Math.min(steps, maxSteps);
        payload.rr_value = Math.min(1 + (capped - minSteps) / (maxSteps - minSteps), 2.0);
      }
    } else if (workout_type === 'golf' && holes) {
      payload.rr_value = Math.min(holes / 9, 2.0);
    } else if (workout_type === 'run' || workout_type === 'cardio') {
      const rrDur = typeof duration === 'number' ? duration / baseDuration : 0;
      const rrDist = typeof distance === 'number' ? distance / 4 : 0;
      const rr = Math.max(rrDur, rrDist);
      payload.rr_value = Math.min(rr, 2.0);
    } else if (workout_type === 'cycling') {
      const rrDur = typeof duration === 'number' ? duration / baseDuration : 0;
      const rrDist = typeof distance === 'number' ? distance / 10 : 0;
      const rr = Math.max(rrDur, rrDist);
      payload.rr_value = Math.min(rr, 2.0);
    } else if (typeof duration === 'number') {
      // Default for gym, yoga, swimming, strength, hiit, sports, etc.
      payload.rr_value = Math.min(duration / baseDuration, 2.0);
    } else {
      payload.rr_value = 1.0;
    }

    // Enforce RR rules: workouts must have RR between 1 and 2.
    if (type === 'workout' && (typeof payload.rr_value !== 'number' || payload.rr_value < 1.0)) {
      return NextResponse.json(
        { error: 'Workout RR must be at least 1.0 to submit. Please increase duration/distance/steps.' },
        { status: 400 }
      );
    }

    // If an entry already exists for the day:
    // - If this is a reupload (reupload_of is set), always create a new entry
    // - Otherwise, block if any existing entry is pending/approved
    // - Allow update/replace only when previous submissions for that day are rejected
    if (existing && !reupload_of) {
      if (!canReplaceRejected) {
        return NextResponse.json(
          { error: `You already submitted an entry for ${normalizedDate}. You can only resubmit if it was rejected.` },
          { status: 409 }
        );
      }

      const { data: updated, error: updateError } = await supabase
        .from('effortentry')
        .update({
          ...payload,
          modified_by: userId,
          modified_date: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data: updated,
        updated: true,
        replacedRejected: true,
      });
    }

    // Insert new entry
    const { data: created, error: insertError } = await supabase
      .from("effortentry")
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: created,
      created: true
    });
  } catch (error) {
    console.error('Error in entries/upsert:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function normalizeDateOnly(input: unknown): string {
  if (typeof input !== 'string') return '';

  // Accept YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;

  // Accept ISO timestamps and similar; keep date portion
  const maybe = input.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(maybe)) return maybe;

  // Fallback: let Postgres attempt to parse; we keep original.
  return input;
}
