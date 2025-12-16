//app/admin/clubs/[clubId]/safeguarding/SafeguardingQuestionsClient.tsx
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
  is_standard_template?: boolean;
};

type Props = {
  clubId: string;
};

const TYPE_OPTIONS: { value: ConsentType; label: string }[] = [
  { value: 'yes_no', label: 'Yes / No toggle' },
  { value: 'checkbox', label: 'Checkbox confirmation' },
  { value: 'text', label: 'Free text' },
  { value: 'multi', label: 'Multi-choice (future)' },
  { value: 'link_confirm', label: 'Policy link + confirm' },
];

const APPLIES_OPTIONS: { value: AppliesTo; label: string }[] = [
  { value: 'all', label: 'All members' },
  { value: 'junior', label: 'Juniors only' },
  { value: 'adult', label: 'Adults only' },
  { value: 'parent', label: 'Parents / guardians' },
  { value: 'household', label: 'Household-level' },
];

export default function SafeguardingQuestionsClient({
  clubId,
}: Props) {
  const [questions, setQuestions] = useState<ConsentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] =
    useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<
    ConsentQuestion | null
  >(null);
  const [creating, setCreating] = useState(false);

  // Load questions
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
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
          console.error('Failed to load safeguarding questions', err);
          setError(
            err?.message ??
              'Failed to load safeguarding questions',
          );
          setQuestions([]);
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

  const startCreate = () => {
    setCreating(true);
    setEditing({
      id: '',
      club_id: clubId,
      label: '',
      description: '',
      type: 'yes_no',
      required: true,
      applies_to: 'all',
      link_url: '',
      sort_order: null,
      is_active: true,
      is_standard_template: false,
    });
    setSaveStatus('idle');
    setError(null);
  };

  const startEdit = (q: ConsentQuestion) => {
    setEditing({ ...q });
    setCreating(false);
    setSaveStatus('idle');
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setCreating(false);
    setSaveStatus('idle');
    setError(null);
  };

  const updateEditing = <K extends keyof ConsentQuestion>(
    key: K,
    value: ConsentQuestion[K],
  ) => {
    if (!editing) return;
    setEditing({ ...editing, [key]: value });
    setSaveStatus('idle');
    setError(null);
  };

  const handleSave = async () => {
    if (!editing) return;

    if (!editing.label.trim()) {
      setError('Question label is required');
      return;
    }

    setSaveStatus('saving');
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/clubs/${clubId}/consent-questions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editing.id || undefined,
            label: editing.label.trim(),
            description:
              editing.description?.trim() || null,
            type: editing.type,
            required: editing.required,
            applies_to: editing.applies_to,
            link_url:
              editing.link_url?.trim() || null,
            is_active: editing.is_active,
          }),
        },
      );

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        const msg =
          json?.error ||
          `Failed to save safeguarding question (status ${res.status})`;
        throw new Error(msg);
      }

      const data = (await res.json()) as {
        question: ConsentQuestion;
      };

      setQuestions((prev) => {
        const exists = prev.some(
          (q) => q.id === data.question.id,
        );
        if (exists) {
          return prev.map((q) =>
            q.id === data.question.id ? data.question : q,
          );
        }
        return [...prev, data.question].sort(
          (a, b) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0),
        );
      });

      setSaveStatus('saved');
      setEditing(null);
      setCreating(false);
    } catch (err: any) {
      console.error('Failed to save safeguarding question', err);
      setError(
        err?.message ??
          'Failed to save safeguarding question',
      );
      setSaveStatus('error');
    }
  };

const moveQuestion = (id: string, direction: 'up' | 'down') => {
  setQuestions((prev) => {
    const idx = prev.findIndex((q) => q.id === id);
    if (idx === -1) return prev;

    const newArr = [...prev];

    if (direction === 'up' && idx > 0) {
      [newArr[idx - 1], newArr[idx]] = [
        newArr[idx],
        newArr[idx - 1],
      ];
    } else if (direction === 'down' && idx < newArr.length - 1) {
      [newArr[idx + 1], newArr[idx]] = [
        newArr[idx],
        newArr[idx + 1],
      ];
    }

    // Keep a tidy sort_order in memory only
    return newArr.map((q, i) => ({
      ...q,
      sort_order: (i + 1) * 10,
    }));
  });
};

  if (loading) {
    return (
      <p className="text-sm text-slate-600">
        Loading safeguarding questions…
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {questions.length} safeguarding / consent questions
          configured for this club.
        </p>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-slate-800"
        >
          + Add question
        </button>
      </div>

      {questions.length === 0 && !editing && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          No safeguarding questions have been created yet. You can
          add your own or later load a standard template set (e.g.
          ECB safeguarding bundle).
        </div>
      )}

      {/* Editing panel */}
      {editing && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">
                {editing.id ? 'Edit question' : 'New question'}
              </h2>
              <p className="text-xs text-slate-500">
                This question will appear in the member onboarding
                flow and in their dashboards.
              </p>
            </div>
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs">
              Question label
              <input
                type="text"
                className="rounded border px-2 py-1.5 text-sm"
                value={editing.label}
                onChange={(e) =>
                  updateEditing('label', e.target.value)
                }
                placeholder="e.g. Do you consent to your child being photographed?"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs">
              Applies to
              <select
                className="rounded border px-2 py-1.5 text-sm"
                value={editing.applies_to}
                onChange={(e) =>
                  updateEditing(
                    'applies_to',
                    e.target.value as AppliesTo,
                  )
                }
              >
                {APPLIES_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs md:col-span-2">
              Description (optional)
              <textarea
                className="min-h-[60px] rounded border px-2 py-1.5 text-sm"
                value={editing.description ?? ''}
                onChange={(e) =>
                  updateEditing('description', e.target.value)
                }
                placeholder="Extra context for parents/members about this question."
              />
            </label>

            <label className="flex flex-col gap-1 text-xs">
              Response type
              <select
                className="rounded border px-2 py-1.5 text-sm"
                value={editing.type}
                onChange={(e) =>
                  updateEditing(
                    'type',
                    e.target.value as ConsentType,
                  )
                }
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs mt-5">
              <input
                type="checkbox"
                checked={editing.required}
                onChange={(e) =>
                  updateEditing('required', e.target.checked)
                }
              />
              Required before membership can be completed
            </label>

            <label className="flex flex-col gap-1 text-xs md:col-span-2">
              Policy link URL (optional)
              <input
                type="url"
                className="rounded border px-2 py-1.5 text-sm"
                value={editing.link_url ?? ''}
                onChange={(e) =>
                  updateEditing('link_url', e.target.value)
                }
                placeholder="https://yourclub.co.uk/safeguarding-policy"
              />
              <span className="text-[11px] text-slate-500">
                For example, link to your safeguarding, selection,
                or photography policy. For{' '}
                <span className="font-medium">link confirm</span>{' '}
                type, members will be asked to open this before
                they can tick “I have read and agree”.
              </span>
            </label>

            <label className="flex items-center gap-2 text-xs md:col-span-2">
              <input
                type="checkbox"
                checked={editing.is_active}
                onChange={(e) =>
                  updateEditing('is_active', e.target.checked)
                }
              />
              Question is active and shown to members
            </label>
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-3">
            <p className="text-[11px] text-slate-500">
              You can change the order of questions from the list
              below. New questions are added to the end.
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="inline-flex items-center rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              {saveStatus === 'saving'
                ? 'Saving…'
                : editing.id
                ? 'Save changes'
                : 'Create question'}
            </button>
          </div>
        </div>
      )}

      {/* Questions list */}
      {questions.length > 0 && (
        <div className="space-y-2">
          {questions
            .slice()
            .sort(
              (a, b) =>
                (a.sort_order ?? 0) - (b.sort_order ?? 0),
            )
            .map((q, index, arr) => (
              <div
                key={q.id}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {q.label}
                    </span>
                    {!q.is_active && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
                        Inactive
                      </span>
                    )}
                    {q.required && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-700">
                        Required
                      </span>
                    )}
                  </div>
                  {q.description && (
                    <p className="text-[11px] text-slate-600">
                      {q.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                    <span className="rounded bg-slate-50 px-2 py-0.5">
                      Type:{' '}
                      {
                        TYPE_OPTIONS.find(
                          (t) => t.value === q.type,
                        )?.label
                      }
                    </span>
                    <span className="rounded bg-slate-50 px-2 py-0.5">
                      Applies to:{' '}
                      {
                        APPLIES_OPTIONS.find(
                          (a) => a.value === q.applies_to,
                        )?.label
                      }
                    </span>
                    {q.link_url && (
                      <span className="rounded bg-slate-50 px-2 py-0.5">
                        Policy link set
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => moveQuestion(q.id, 'up')}
                    disabled={index === 0}
                    className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveQuestion(q.id, 'down')}
                    disabled={index === arr.length - 1}
                    className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-600 disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(q)}
                    className="rounded border border-slate-200 px-2 py-1 text-[11px] text-slate-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {saveStatus === 'saved' && !error && !editing && (
        <p className="text-[11px] text-emerald-700">
          Safeguarding question saved.
        </p>
      )}
    </div>
  );
}
