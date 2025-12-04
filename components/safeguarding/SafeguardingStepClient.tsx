//components/safeguarding/SafeguardingStepClient.tsx
'use client';

import { useEffect, useState } from 'react';

type ConsentType =
  | 'yes_no'
  | 'checkbox'
  | 'text'
  | 'multi'
  | 'link_confirm';

type AppliesTo =
  | 'all'
  | 'junior'
  | 'adult'
  | 'parent'
  | 'household';

type ConsentQuestion = {
  id: string;
  club_id: string;
  label: string;
  description: string | null;
  type: ConsentType;
  required: boolean;
  applies_to: AppliesTo;
  link_url: string | null;
  sort_order: number | null;
  is_active: boolean;
};

type SafeguardingContext = 'junior' | 'adult' | 'parent' | 'household';

type Props = {
  clubId: string;
  memberId?: string;
  householdId?: string;
  context: SafeguardingContext;
  onComplete?: () => void;
};

type AnswerValue = boolean | string | null;

export default function SafeguardingStepClient({
  clubId,
  memberId,
  householdId,
  context,
  onComplete,
}: Props) {
  const [questions, setQuestions] = useState<ConsentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Reuse the admin GET – it already filters by club + active
        const res = await fetch(
          `/api/admin/clubs/${clubId}/consent-questions`,
        );

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          const msg =
            json?.error ||
            `Failed to load safeguarding questions (status ${res.status})`;
          throw new Error(msg);
        }

        const data = (await res.json()) as {
          questions: ConsentQuestion[];
        };

        if (!cancelled) {
          setQuestions(data.questions || []);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load safeguarding questions (member view)', err);
          setError(
            err?.message ??
              'Failed to load safeguarding questions.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [clubId]);

  
    useEffect(() => {
    // Only bother if we know who/which household this is for
    if (!householdId || !memberId) return;

    let cancelled = false;

    async function loadExistingResponses() {
      try {
        const params = new URLSearchParams();

        if (householdId) {
          params.set('householdId', householdId);
        }

        if (memberId) {
          params.set('memberId', memberId);
}

        const res = await fetch(
          `/api/consent-responses?${params.toString()}`,
        );

        if (!res.ok) {
          // Not fatal – form can still be completed from scratch
          console.warn(
            'Failed to load existing consent responses',
            res.status,
          );
          return;
        }

        const data = (await res.json()) as {
          responses: {
            question_id: string;
            response: { value: AnswerValue } | null;
          }[];
        };

        if (cancelled) return;

        const initial: Record<string, AnswerValue> = {};

        for (const r of data.responses ?? []) {
          initial[r.question_id] = r.response?.value ?? null;
        }

        // Merge into current answers (so we don't blow away any in-progress edits)
        setAnswers((prev) => ({
          ...initial,
          ...prev,
        }));
      } catch (err) {
        console.warn(
          'Error loading existing consent responses',
          err,
        );
      }
    }

    void loadExistingResponses();

    return () => {
      cancelled = true;
    };
  }, [householdId, memberId]);


  // Filter questions by context
  // For now, show all active, required questions regardless of context
  const visibleQuestions = questions
    .filter((q) => q.is_active !== false)
    .filter((q) => q.required)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));


  const updateAnswer = (id: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setError(null);
  };

  const handleViewPolicy = (q: ConsentQuestion) => {
    if (!q.link_url) return;
    window.open(q.link_url, '_blank', 'noopener,noreferrer');
  };

  const validateAnswers = () => {
    const missingRequired: string[] = [];

    for (const q of visibleQuestions) {
      if (!q.required) continue;
      const val = answers[q.id];

      switch (q.type) {
        case 'yes_no':
        case 'checkbox':
        case 'link_confirm':
          if (val !== true && val !== false) {
            missingRequired.push(q.label);
          }
          break;
        case 'text':
          if (
            typeof val !== 'string' ||
            val.trim().length === 0
          ) {
            missingRequired.push(q.label);
          }
          break;
        case 'multi':
          // For now, treat as required boolean/text – can extend later
          if (
            val == null ||
            (typeof val === 'string' &&
              val.trim().length === 0)
          ) {
            missingRequired.push(q.label);
          }
          break;
        default:
          break;
      }
    }

    if (missingRequired.length > 0) {
      setError(
        'Please complete all required safeguarding questions before continuing.',
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!memberId && !householdId) {
      setError(
        'Internal error: no member or household context provided.',
      );
      return;
    }

    if (!validateAnswers()) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        club_id: clubId,
        responses: visibleQuestions.map((q) => ({
          question_id: q.id,
          member_id: memberId ?? null,
          household_id: householdId ?? null,
          value: answers[q.id] ?? null,
        })),
      };

      const res = await fetch('/api/consent-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg =
          json?.error ||
          `Failed to save safeguarding responses (status ${res.status})`;
        throw new Error(msg);
      }

      if (onComplete) onComplete();
    } catch (err: any) {
      console.error('Failed to save safeguarding responses', err);
      setError(
        err?.message ??
          'Failed to save safeguarding responses. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Loading safeguarding & consent questions…
      </div>
    );
  }

  if (visibleQuestions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        This club has not configured any safeguarding questions yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">
          Safeguarding & consents
        </h2>
        <p className="text-sm text-slate-600">
          Please review and answer the safeguarding and consent
          questions below. These help the club keep players safe and
          comply with safeguarding policies.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {visibleQuestions.map((q) => {
          const val = answers[q.id];

          return (
            <div
              key={q.id}
              className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium">
                    {q.label}
                    {q.required && (
                      <span className="ml-1 text-xs font-normal text-rose-600">
                        *
                      </span>
                    )}
                  </h3>
                  {q.description && (
                    <p className="mt-0.5 text-xs text-slate-600">
                      {q.description}
                    </p>
                  )}
                </div>
                {q.link_url && (
                  <button
                    type="button"
                    onClick={() => handleViewPolicy(q)}
                    className="text-xs font-medium text-slate-700 underline underline-offset-2"
                  >
                    View policy
                  </button>
                )}
              </div>

              {/* Input control */}
              <div className="text-sm">
                {q.type === 'yes_no' && (
                  <div className="flex gap-3 text-xs">
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={val === true}
                        onChange={() =>
                          updateAnswer(q.id, true)
                        }
                      />
                      Yes
                    </label>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={val === false}
                        onChange={() =>
                          updateAnswer(q.id, false)
                        }
                      />
                      No
                    </label>
                  </div>
                )}

                {q.type === 'checkbox' && (
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={val === true}
                      onChange={(e) =>
                        updateAnswer(q.id, e.target.checked)
                      }
                    />
                    I agree / I confirm
                  </label>
                )}

                {q.type === 'link_confirm' && (
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={val === true}
                      onChange={(e) =>
                        updateAnswer(q.id, e.target.checked)
                      }
                    />
                    I have read and agree to this policy
                  </label>
                )}

                {q.type === 'text' && (
                  <textarea
                    className="mt-1 min-h-[80px] w-full rounded border px-2 py-1 text-xs"
                    value={(val as string) ?? ''}
                    onChange={(e) =>
                      updateAnswer(q.id, e.target.value)
                    }
                    placeholder="Enter details here."
                  />
                )}

                {q.type === 'multi' && (
                  <textarea
                    className="mt-1 min-h-[60px] w-full rounded border px-2 py-1 text-xs"
                    value={(val as string) ?? ''}
                    onChange={(e) =>
                      updateAnswer(q.id, e.target.value)
                    }
                    placeholder="Select/enter options (multi-choice support can be extended later)."
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-3">
        <p className="text-xs text-slate-500">
          All required questions must be completed before you can
          continue with membership.
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center rounded bg-slate-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save & continue'}
        </button>
      </div>
    </div>
  );
}
