// app/api/interest/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Payload = {
  clubName: string;
  name: string;
  email: string;
  role?: string;
  notes?: string;
  website?: string; // honeypot (should be empty)
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

console.log("has SUPABASE_URL?", !!process.env.SUPABASE_URL);
console.log("has SERVICE KEY?", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Payload>;

    // Basic spam honeypot: real users won't fill this in
    if (body.website && String(body.website).trim() !== "") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const clubName = String(body.clubName ?? "").trim();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const role = String(body.role ?? "").trim() || null;
    const notes = String(body.notes ?? "").trim() || null;

    if (!clubName || !name || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    if (!isEmail(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: "Server not configured (Supabase)" },
        { status: 500 },
      );
    }

    const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
    const postmarkFrom = process.env.POSTMARK_FROM;
    const postmarkTo = process.env.POSTMARK_TO;

    if (!postmarkToken || !postmarkFrom || !postmarkTo) {
      return NextResponse.json(
        { error: "Server not configured (Postmark)" },
        { status: 500 },
      );
    }

    const ua = req.headers.get("user-agent");
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const sourceUrl = req.headers.get("referer");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from("interest_leads")
      .insert({
        club_name: clubName,
        contact_name: name,
        email,
        role,
        notes,
        source_url: sourceUrl,
        user_agent: ua,
        ip,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save lead", details: error },
        { status: 500 },
      );
    }

    // Email you via Postmark
    const subject = `New ClubStand interest: ${clubName}`;
    const textBody = [
      `Club: ${clubName}`,
      `Name: ${name}`,
      `Email: ${email}`,
      role ? `Role: ${role}` : null,
      notes ? `Notes: ${notes}` : null,
      sourceUrl ? `Source: ${sourceUrl}` : null,
      ip ? `IP: ${ip}` : null,
      ua ? `User-Agent: ${ua}` : null,
      `Lead ID: ${data.id}`,
    ]
      .filter(Boolean)
      .join("\n");

    const pmRes = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": postmarkToken,
      },
    body: JSON.stringify({
      From: postmarkFrom,
      To: postmarkTo,
      Subject: subject,
      TextBody: textBody,
      ReplyTo: email, // so you can reply directly to the club admin
      MessageStream: "outbound",
    }),
    });

    if (!pmRes.ok) {
      const pmErr = await pmRes.text().catch(() => "");
      // Lead is already saved; we still return ok, but include debug for you in dev
      return NextResponse.json(
        { ok: true, leadId: data.id, warning: "Saved but email failed", pmErr },
        { status: 200 },
      );
    }

    return NextResponse.json({ ok: true, leadId: data.id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected error", message: e?.message ?? String(e) },
      { status: 500 },
    );
  }
}
