// app/api/admin/clubs/[clubId]/membership-settings/route.ts
import { NextResponse } from 'next/server';
import { getCurrentAdminForClub } from '@/lib/admins';
import { canManagePlans } from '@/lib/permissions';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { DEFAULT_MEMBERSHIP_SETTINGS } from '@/lib/membership/rules';

async function clubIdFrom(ctx: any) {
  const p = ctx.params;
  return (typeof p?.then === 'function' ? await p : p).clubId as string;
}

function validMonthDay(month: number, day: number) {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(day) || day < 1) return false;
  return day <= new Date(Date.UTC(2024, month, 0)).getUTCDate(); // leap year permits 29 Feb
}

export async function GET(req: Request, ctx: any) {
  const clubId = await clubIdFrom(ctx);
  const admin = await getCurrentAdminForClub(req, clubId);
  if (!admin || !canManagePlans(admin)) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const { data, error } = await supabaseServerClient
    .from('club_membership_settings').select('*').eq('club_id', clubId).maybeSingle();
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Membership settings table is not available yet.', needsMigration: true }, { status: 503 });
  }
  return NextResponse.json({ settings: { ...DEFAULT_MEMBERSHIP_SETTINGS, ...(data ?? {}), club_id: clubId } });
}

export async function PUT(req: Request, ctx: any) {
  const clubId = await clubIdFrom(ctx);
  const admin = await getCurrentAdminForClub(req, clubId);
  if (!admin || !canManagePlans(admin)) return NextResponse.json({ error: 'Not authorised.' }, { status: 403 });

  const b = await req.json().catch(() => null);
  if (!b) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const joiningRoutes = ['invite', 'approval', 'open'];
  const midSeasonTreatments = ['full', 'prorata', 'trial', 'manual'];
  const juniorAge = Number(b.junior_age_under);
  const assessmentMonth = Number(b.age_assessment_month);
  const assessmentDay = Number(b.age_assessment_day);
  const yearStartMonth = Number(b.membership_year_start_month);
  const yearStartDay = Number(b.membership_year_start_day);
  const trialDays = Number(b.trial_days) || 0;

  if (!joiningRoutes.includes(b.joining_route) || !midSeasonTreatments.includes(b.mid_season_treatment)) {
    return NextResponse.json({ error: 'Membership settings contain an unsupported option.' }, { status: 400 });
  }
  if (!Number.isInteger(juniorAge) || juniorAge < 1 || juniorAge > 99) {
    return NextResponse.json({ error: 'Junior age is invalid.' }, { status: 400 });
  }
  if (!validMonthDay(assessmentMonth, assessmentDay) || !validMonthDay(yearStartMonth, yearStartDay)) {
    return NextResponse.json({ error: 'One of the configured dates is invalid.' }, { status: 400 });
  }
  if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 366) {
    return NextResponse.json({ error: 'Trial length must be between 0 and 366 days.' }, { status: 400 });
  }

  const payload = {
    club_id: clubId,
    joining_route: b.joining_route,
    allow_non_member_account_holder: !!b.allow_non_member_account_holder,
    junior_age_under: juniorAge,
    age_assessment_month: assessmentMonth,
    age_assessment_day: assessmentDay,
    mid_season_treatment: b.mid_season_treatment,
    trial_days: trialDays,
    allow_annual: !!b.allow_annual,
    allow_monthly: !!b.allow_monthly,
    allow_offline: !!b.allow_offline,
    membership_year_start_month: yearStartMonth,
    membership_year_start_day: yearStartDay,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServerClient
    .from('club_membership_settings').upsert(payload, { onConflict: 'club_id' }).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not save membership settings.', details: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
