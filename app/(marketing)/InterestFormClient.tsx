//app/(marketing)/InterestFormClient.tsx
"use client";

import { useState } from "react";

export default function InterestFormClient() {
  const [clubName, setClubName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");

  // Honeypot
  const [website, setWebsite] = useState("");

  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);

    try {
      const res = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clubName,
          name,
          email,
          role,
          notes,
          website,
        }),
      });

      const j = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(j?.error || "Failed to submit");
      }

      setDone(true);
    } catch (err: any) {
      setError(err?.message || "Failed to submit");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Thanks — we’ve got it.</div>
        <p className="mt-2 text-sm text-slate-600">
          We’ll be in touch shortly.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
    >
      {/* Honeypot: hidden from humans */}
      <div className="hidden">
        <label>
          Website
          <input value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <Field label="Club name" value={clubName} onChange={setClubName} />
      <Field label="Your name" value={name} onChange={setName} />
      <Field label="Email" type="email" value={email} onChange={setEmail} />
      <Field label="Your role (optional)" value={role} onChange={setRole} />

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Notes (optional)</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none"
          placeholder="What are you trying to fix? Payments, renewals, safeguarding, admin workload..."
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "var(--club-primary, #2563eb)" }}
      >
        {sending ? "Sending…" : "Register interest"}
      </button>

      <p className="text-xs text-slate-500">
        We’ll only use this to contact you about ClubStand.
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none"
      />
    </label>
  );
}
