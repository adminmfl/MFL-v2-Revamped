import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/client";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/config';
import { fetchMemberProfile } from "@/lib/services/memberships";

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as import('next-auth').Session | null;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, type, workout_type, duration, distance, steps, holes } = body;

  // Lookup age/team from new membership schema (users + leaguemembers)
  const membership = await fetchMemberProfile(session.user.id);
  if (!membership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });
  const userAge = membership.age;
  let baseDuration = 45;
  let minSteps = 10000, maxSteps = 20000;
  if (typeof userAge === 'number') {
    if (userAge > 75) {
      minSteps = 3000; maxSteps = 6000;
      baseDuration = 30;
    } else if (userAge > 65) {
      minSteps = 5000; maxSteps = 10000;
      baseDuration = 30;
    } else if (userAge >= 65) {
      minSteps = 5000; maxSteps = 10000;
      baseDuration = 30;
    }
  }

  // check existing entry
  const { data: existing } = await getSupabase()
    .from("effortentry")
    .select("id")
    .eq("league_member_id", membership.leagueMemberId)
    .eq("date", date)
    .maybeSingle();

  type EntryPayload = {
    league_member_id: string;
    date: string;
    type: 'workout' | 'rest';
    workout_type?: string;
    duration?: number;
    distance?: number;
    steps?: number;
    holes?: number;
    rr_value?: number;
  };

  const payload: EntryPayload = {
    league_member_id: membership.leagueMemberId,
    date,
    type,
    workout_type,
    duration,
    distance,
    steps,
    holes,
  };

  // RR calculation with senior thresholds
  if (type === 'rest') payload.rr_value = 1.0;
  else if (workout_type === 'steps' && steps) {
    if (steps < minSteps) payload.rr_value = 0;
    else {
      const capped = Math.min(steps, maxSteps);
      payload.rr_value = Math.min(1 + (capped - minSteps) / (maxSteps - minSteps), 2.0);
    }
  }
  else if (workout_type === 'golf' && holes) payload.rr_value = Math.min(holes / 9, 2.5);
  else if (workout_type === 'run') {
    const rrDur = typeof duration === 'number' ? duration / baseDuration : 0;
    const rrDist = typeof distance === 'number' ? distance / 4 : 0; // distance unchanged
    const rr = Math.max(rrDur, rrDist);
    payload.rr_value = Math.min(rr, 2.5);
  } else if (workout_type === 'cycling') {
    const rrDur = typeof duration === 'number' ? duration / baseDuration : 0;
    const rrDist = typeof distance === 'number' ? distance / 10 : 0;
    const rr = Math.max(rrDur, rrDist);
    payload.rr_value = Math.min(rr, 2.5);
  } else if (typeof duration === 'number') {
    // gym, yoga, swimming, badminton_pickleball, basketball_cricket, meditation
    payload.rr_value = Math.min(duration / baseDuration, 2.5);
  } else payload.rr_value = 1.0;

  if (existing) {
    const { error } = await getSupabase().from("effortentry").update(payload).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, updated: true });
  }

  const { error } = await getSupabase().from("effortentry").insert(payload);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, created: true });
}


