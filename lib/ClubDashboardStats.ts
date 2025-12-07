//lib/ClubDashboardStats.ts

import { supabaseServerClient } from "@/lib/supabaseServer";
import type { Tables } from "@/lib/database.types";

type MemberRow = Tables<"members">;
type SubscriptionRow = Tables<"membership_subscriptions">;
// type ConsentQuestionRow = Tables<"club_consent_questions">;
// type ConsentResponseRow = Tables<"member_consent_responses">;

export type YesNoUnknown = "yes" | "no" | "not_answered";

export interface MemberWithStats {
  id: string;
  fullName: string;
  gender: MemberRow["gender"];
  memberType: MemberRow["member_type"];
  status: MemberRow["status"];
  dateOfBirth: string | null;
  ageOnSept1: number | null;
  ageBand: string | null; // e.g. U9, U10… U18 or null for adults
  isCounty: boolean;
  isDistrict: boolean;
  photoConsent: YesNoUnknown;
  medicalFlag: YesNoUnknown;
  latestSubscriptionStatus: SubscriptionRow["status"] | null;
  latestSubscriptionYear: number | null;
  latestSubscriptionStart: string | null;
}

export interface JuniorWithStats extends MemberWithStats {}

export interface ClubDashboardStats {
  seasonSept1Date: string; // ISO string for the reference 1 Sept date
  totalMembers: number;
  activeMembers: number;
  maleCount: number;
  femaleCount: number;
  juniorMaleCount: number;
  juniorFemaleCount: number;
  juniorBands: Record<string, number>; // e.g. { U9: 4, U10: 7, ... }
  countyCount: number;
  districtCount: number;
  juniorsNoPhotoConsentCount: number;
  members: MemberWithStats[];
  juniors: JuniorWithStats[];
}

// Helper: get the 1st September that defines the *current* cricket season.
// If today is before 1st Sept -> use last year’s 1 Sept.
// If today is on/after 1st Sept -> use this year’s 1 Sept.
function getSeasonSept1(today = new Date()): Date {
  const year =
    today.getMonth() >= 8 /* 0-based: 8 = September */ ? today.getFullYear() : today.getFullYear() - 1;
  return new Date(year, 8, 1);
}

// Age on that 1 Sept
function getAgeOnSeasonSept1(dobIso: string | null, today = new Date()): number | null {
  if (!dobIso) return null;
  const dob = new Date(dobIso);
  if (Number.isNaN(dob.getTime())) return null;

  const sept1 = getSeasonSept1(today);
  let age = sept1.getFullYear() - dob.getFullYear();

  const birthdayThisSeasonYear = new Date(
    sept1.getFullYear(),
    dob.getMonth(),
    dob.getDate(),
  );

  if (birthdayThisSeasonYear > sept1) {
    age -= 1;
  }

  if (age < 0) return null;
  return age;
}

// Map age on 1 Sept -> age band
// Age N means they play *under (N+1)*, clamped between U9 and U18.
// Adults (age >= 18) get null (no junior band).
function getAgeBandFromAge(age: number | null): string | null {
  if (age === null) return null;
  if (age >= 18) return null; // adult

  let groupAge = age + 1; // age 12 => U13, age 17 => U18
  if (groupAge < 9) groupAge = 9;
  if (groupAge > 18) groupAge = 18;

  return `U${groupAge}`;
}

function normaliseYesNoFromResponse(raw: any): YesNoUnknown {
  if (raw === null || raw === undefined) return "not_answered";

  if (typeof raw === "boolean") return raw ? "yes" : "no";

  if (typeof raw === "object") {
    const v = raw.value;
    if (typeof v === "boolean") return v ? "yes" : "no";
  }

  return "not_answered";
}

export async function loadClubDashboardData(
  clubId: string,
): Promise<ClubDashboardStats> {
  const supabase = supabaseServerClient;

  const [membersRes, subsRes, questionsRes, responsesRes] = await Promise.all([
    supabase
      .from("members")
      .select(
        "id, club_id, first_name, last_name, preferred_name, gender, member_type, status, date_of_birth, is_county_player, is_district_player",
      )
      .eq("club_id", clubId),
    supabase
      .from("membership_subscriptions")
      .select("id, member_id, status, membership_year, start_date")
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

  const members = (membersRes.data ?? []) as MemberRow[];
  const subs = (subsRes.data ?? []) as any[];
  const questions = (questionsRes.data ?? []) as any[];
  const responses = (responsesRes.data ?? []) as any[];

  const today = new Date();
  const seasonSept1 = getSeasonSept1(today);

  // Work out which questions count as "photo" and which as "medical"
  const photoQuestionIds = new Set<string>();
  const medicalQuestionIds = new Set<string>();

  for (const q of questions) {
    const label = (q.label ?? "").toLowerCase();
    if (
      label.includes("photo") ||
      label.includes("photograph") ||
      label.includes("image")
    ) {
      photoQuestionIds.add(q.id as string);
    }
    if (label.includes("medical") || label.includes("health")) {
      medicalQuestionIds.add(q.id as string);
    }
  }

  // Build consent maps per member
  const photoByMember = new Map<string, YesNoUnknown>();
  const medicalByMember = new Map<string, YesNoUnknown>();

  for (const r of responses) {
    const memberId = r.member_id as string | null;
    if (!memberId) continue;

    const qId = r.question_id as string;
    const raw = (r as any).response;
    const value = normaliseYesNoFromResponse(raw);

    if (photoQuestionIds.has(qId)) {
      // If multiple, a definite "no" should win over "yes"
      const existing = photoByMember.get(memberId);
      if (value === "no" || !existing) {
        photoByMember.set(memberId, value);
      }
    }

    if (medicalQuestionIds.has(qId)) {
      const existing = medicalByMember.get(memberId);
      if (value === "no" || !existing) {
        medicalByMember.set(memberId, value);
      }
    }
  }

  // Latest subscription per member (by membership_year then start_date)
  const subsByMember = new Map<
    string,
    { status: SubscriptionRow["status"]; membership_year: number; start_date: string }
  >();

  for (const sub of subs) {
    const memberId = sub.member_id as string | null;
    if (!memberId) continue;
    const existing = subsByMember.get(memberId);
    if (
      !existing ||
      sub.membership_year > existing.membership_year ||
      (sub.membership_year === existing.membership_year &&
        sub.start_date > existing.start_date)
    ) {
      subsByMember.set(memberId, {
        status: sub.status,
        membership_year: sub.membership_year as unknown as number,
        start_date: sub.start_date,
      });
    }
  }

  const membersWithStats: MemberWithStats[] = members.map((m) => {
    const fullName = m.preferred_name
      ? `${m.preferred_name} ${m.last_name}`
      : `${m.first_name} ${m.last_name}`;

    const ageOnSept1 = getAgeOnSeasonSept1(m.date_of_birth, today);
    const ageBand = getAgeBandFromAge(ageOnSept1);

    const photoConsent =
      photoQuestionIds.size > 0
        ? photoByMember.get(m.id) ?? "not_answered"
        : "not_answered";

    const medicalFlag =
      medicalQuestionIds.size > 0
        ? medicalByMember.get(m.id) ?? "not_answered"
        : "not_answered";

    const subInfo = subsByMember.get(m.id);

    return {
      id: m.id,
      fullName,
      gender: m.gender,
      memberType: m.member_type,
      status: m.status,
      dateOfBirth: m.date_of_birth,
      ageOnSept1,
      ageBand,
      isCounty: m.is_county_player,
      isDistrict: m.is_district_player,
      photoConsent,
      medicalFlag,
      latestSubscriptionStatus: subInfo?.status ?? null,
      latestSubscriptionYear: subInfo?.membership_year ?? null,
      latestSubscriptionStart: subInfo?.start_date ?? null,
    };
  });

  const totalMembers = membersWithStats.length;
  const activeMembers = membersWithStats.filter(
    (m) => m.status === "active",
  ).length;

  const maleCount = membersWithStats.filter((m) => m.gender === "male").length;
  const femaleCount = membersWithStats.filter(
    (m) => m.gender === "female",
  ).length;

  const juniors = membersWithStats.filter(
    (m) => m.ageBand !== null && m.memberType === "player",
  );

  const juniorMaleCount = juniors.filter((j) => j.gender === "male").length;
  const juniorFemaleCount = juniors.filter(
    (j) => j.gender === "female",
  ).length;

  const juniorBands: Record<string, number> = {};
  for (const j of juniors) {
    if (!j.ageBand) continue;
    juniorBands[j.ageBand] = (juniorBands[j.ageBand] ?? 0) + 1;
  }

  const countyCount = juniors.filter((j) => j.isCounty).length;
  const districtCount = juniors.filter((j) => j.isDistrict).length;

  const juniorsNoPhotoConsentCount = juniors.filter(
    (j) => j.photoConsent !== "yes",
  ).length;

  return {
    seasonSept1Date: seasonSept1.toISOString(),
    totalMembers,
    activeMembers,
    maleCount,
    femaleCount,
    juniorMaleCount,
    juniorFemaleCount,
    juniorBands,
    countyCount,
    districtCount,
    juniorsNoPhotoConsentCount,
    members: membersWithStats,
    juniors,
  };
}
