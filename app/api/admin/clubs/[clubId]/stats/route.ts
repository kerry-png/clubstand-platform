// app/api/admin/clubs/[clubId]/stats/route.ts

import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/lib/supabaseServer";

// Cricket rule: age on 1 September before the season
function calculateAgeOnSept1(dob: string | null, seasonYear: number) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;

  // 1 Sept of previous year for the given season
  const sept1 = new Date(seasonYear - 1, 8, 1);

  let age = sept1.getFullYear() - birth.getFullYear();
  const birthdayThisYear = new Date(
    sept1.getFullYear(),
    birth.getMonth(),
    birth.getDate(),
  );
  if (birthdayThisYear > sept1) age -= 1;
  if (age < 0) return null;

  return age;
}

function calculateAgeBand(age: number | null): string | null {
  if (age === null) return null;
  if (age >= 18) return null;

  let bandAge = age + 1; // age 12 → U13
  if (bandAge < 9) bandAge = 9;
  if (bandAge > 18) bandAge = 18;

  return `U${bandAge}`;
}

type RouteContext =
  | { params: { clubId: string } }
  | { params: Promise<{ clubId: string }> };

export async function GET(req: Request, context: RouteContext) {
  try {
    const supabase = supabaseServerClient;

    // 🔑 Handle both plain-object and Promise-style params
    const rawParams: any = (context as any).params;
    const resolvedParams =
      rawParams && typeof rawParams.then === "function"
        ? await rawParams
        : rawParams;

    const clubId = resolvedParams?.clubId as string | undefined;

    console.log("Stats route params:", {
      rawParamsType: typeof rawParams,
      hasThen: !!rawParams?.then,
      resolvedParams,
      clubId,
    });

    if (!clubId) {
      return NextResponse.json(
        { error: "Missing clubId in route params" },
        { status: 400 },
      );
    }

    // Determine season year
    const url = new URL(req.url);
    const seasonYear =
      Number(url.searchParams.get("year")) ||
      new Date().getFullYear() + 1;

    // Load data
    const [membersRes, subsRes, questionsRes, responsesRes] =
      await Promise.all([
        supabase
          .from("members")
          .select(
            `id, household_id, first_name, last_name, gender, date_of_birth,
             member_type, status, is_county_player, is_district_player`,
          )
          .eq("club_id", clubId),

        supabase
          .from("membership_subscriptions")
          .select("member_id, status, membership_year, start_date")
          .eq("club_id", clubId),

        supabase
          .from("club_consent_questions")
          .select("id, label, is_active")
          .eq("club_id", clubId)
          .eq("is_active", true),

        supabase
          .from("member_consent_responses")
          .select("member_id, question_id, response")
          .eq("club_id", clubId),
      ]);

    if (membersRes.error) throw membersRes.error;
    if (subsRes.error) throw subsRes.error;
    if (questionsRes.error) throw questionsRes.error;
    if (responsesRes.error) throw responsesRes.error;

    const members = membersRes.data ?? [];
    const subs = subsRes.data ?? [];
    const responses = responsesRes.data ?? [];
    const questions = questionsRes.data ?? [];

    // Identify photo & medical question IDs
    const photoIds = new Set<string>();
    const medicalIds = new Set<string>();

    for (const q of questions) {
      const l = (q.label ?? "").toLowerCase();
      if (l.includes("photo") || l.includes("image")) photoIds.add(q.id);
      if (l.includes("medical") || l.includes("health")) medicalIds.add(q.id);
    }

    // Build consent map
    const photoMap = new Map<string, "yes" | "no" | "unknown">();
    const medicalMap = new Map<string, "yes" | "no" | "unknown">();

    for (const r of responses) {
      const memberId = r.member_id as string | null;
      if (!memberId) continue;

      const raw = (r.response as any)?.value ?? null;
      const normalised: "yes" | "no" | "unknown" =
        raw === true ? "yes" : raw === false ? "no" : "unknown";

      if (photoIds.has(r.question_id)) {
        if (normalised === "no" || !photoMap.get(memberId)) {
          photoMap.set(memberId, normalised);
        }
      }

      if (medicalIds.has(r.question_id)) {
        if (normalised === "no" || !medicalMap.get(memberId)) {
          medicalMap.set(memberId, normalised);
        }
      }
    }

    // Latest subscription per member
    const latestSub = new Map<
      string,
      {
        status: string;
        membership_year: number;
        start_date: string | null;
      }
    >();

    for (const s of subs as any[]) {
      const memberId = s.member_id as string;
      const existing = latestSub.get(memberId);

      const sStart = (s.start_date ?? "") as string;
      const existingStart = (existing?.start_date ?? "") as string;

      if (
        !existing ||
        s.membership_year > existing.membership_year ||
        (s.membership_year === existing.membership_year &&
          sStart > existingStart)
      ) {
        latestSub.set(memberId, {
          status: s.status,
          membership_year: s.membership_year,
          start_date: s.start_date,
        });
      }
    }

    // Transform members → MemberWithFlags shape
    const transformed = (members as any[]).map((m) => {
      const age = calculateAgeOnSept1(m.date_of_birth, seasonYear);
      const band = calculateAgeBand(age);
      const isJunior = band !== null && m.member_type === "player";

      const sub = latestSub.get(m.id as string);

      return {
        id: m.id,
        household_id: m.household_id,
        first_name: m.first_name,
        last_name: m.last_name,
        gender: m.gender,
        date_of_birth: m.date_of_birth,
        member_type: m.member_type,
        status: m.status,
        is_county_player: m.is_county_player,
        is_district_player: m.is_district_player,
        age_on_1_september: age,
        age_band: band,
        is_junior: isJunior,
        photo_consent: photoMap.get(m.id) ?? "unknown",
        medical_info: medicalMap.get(m.id) ?? "unknown",
        has_active_membership: sub?.status === "active",
        latest_membership_start: sub?.start_date ?? null,
      };
    });

    const juniors = transformed.filter((m) => m.is_junior);

    // Totals
    const totals = {
      totalMembers: transformed.length,
      activeMembers: transformed.filter((m) => m.status === "active").length,
      male: transformed.filter((m) => m.gender === "male").length,
      female: transformed.filter((m) => m.gender === "female").length,
      other: transformed.filter(
        (m) => m.gender !== "male" && m.gender !== "female",
      ).length,
      juniors: juniors.length,
      juniorsMale: juniors.filter((m) => m.gender === "male").length,
      juniorsFemale: juniors.filter((m) => m.gender === "female").length,
      countyPlayers: juniors.filter((m) => m.is_county_player).length,
      districtPlayers: juniors.filter((m) => m.is_district_player).length,
      juniorsNoPhotoConsent: juniors.filter(
        (m) => m.photo_consent !== "yes",
      ).length,
    };

    // Age band counts
    const bandCounts: Record<string, number> = {};
    for (const j of juniors) {
      if (!j.age_band) continue;
      bandCounts[j.age_band] = (bandCounts[j.age_band] ?? 0) + 1;
    }

    return NextResponse.json({
      seasonYear,
      totals,
      bandCounts,
      members: transformed,
      juniors,
    });
  } catch (err: any) {
    console.error("Stats API error:", err);
    return NextResponse.json(
      { error: err.message ?? "Failed to load stats" },
      { status: 500 },
    );
  }
}
