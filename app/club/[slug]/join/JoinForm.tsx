// app/club/[slug]/join/JoinForm.tsx

'use client';

import { useState, type FormEvent } from 'react';

type Plan = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  clubId: string;
  plans: Plan[];
};

type JuniorFormRow = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  plan_id: string;
};

export default function JoinForm({ clubId, plans }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [householdEmail, setHouseholdEmail] = useState('');
  const [householdName, setHouseholdName] = useState('');

  // Start with one junior row by default
  const [juniors, setJuniors] = useState<JuniorFormRow[]>([
    {
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      plan_id: plans[0]?.id ?? '',
    },
  ]);

  function updateJunior(index: number, patch: Partial<JuniorFormRow>) {
    setJuniors((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addJunior() {
    setJuniors((prev) => [
      ...prev,
      {
        first_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        plan_id: plans[0]?.id ?? '',
      },
    ]);
  }

  function removeJunior(index: number) {
    setJuniors((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      // Basic front-end validation: at least one junior, all required fields filled
      const cleanedJuniors = juniors.filter(
        (j) =>
          j.first_name.trim() &&
          j.last_name.trim() &&
          j.date_of_birth &&
          j.gender &&
          j.plan_id,
      );

      if (!cleanedJuniors.length) {
        setError('Please enter details for at least one junior player.');
        setLoading(false);
        return;
      }

      const payload = {
        clubId,
        household: {
          email: householdEmail,
          name: householdName || undefined,
        },
        members: cleanedJuniors.map((j) => ({
          first_name: j.first_name.trim(),
          last_name: j.last_name.trim(),
          date_of_birth: j.date_of_birth,
          gender: j.gender,
          member_type: 'player' as const,
          plans: [j.plan_id],
        })),
      };

      // 1️⃣ Create household, members, and pending subscriptions
      const joinRes = await fetch('/api/memberships/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let joinData: any = null;

      try {
        joinData = await joinRes.json();
      } catch (err) {
        console.error('Failed to parse JSON response from join API:', err);
      }

      if (!joinRes.ok) {
        setError(
          joinData?.details ||
            joinData?.error ||
            'Something went wrong creating the membership.',
        );
        setLoading(false);
        return;
      }

      const householdId = joinData?.householdId as string | undefined;

      if (!householdId) {
        console.error('Join API did not return householdId:', joinData);
        setError(
          'Membership created, but we could not start the payment session (missing household ID).',
        );
        setLoading(false);
        return;
      }

      // 2️⃣ Create Stripe Checkout session for this household’s pending subscriptions
      const checkoutRes = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ householdId }),
      });

      let checkoutData: any = null;

      try {
        checkoutData = await checkoutRes.json();
      } catch (err) {
        console.error('Failed to parse JSON response from checkout API:', err);
      }

      if (!checkoutRes.ok) {
        setError(
          checkoutData?.error ||
            'Membership saved, but starting payment failed. Please contact the club.',
        );
        setLoading(false);
        return;
      }

      const checkoutUrl = checkoutData?.url as string | undefined;

      if (!checkoutUrl) {
        console.error('Checkout API did not return a URL:', checkoutData);
        setError(
          'Membership saved, but we could not start the payment session (no checkout URL).',
        );
        setLoading(false);
        return;
      }

      // 3️⃣ Redirect to Stripe Checkout
      setMessage('Redirecting you to secure payment…');
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Unexpected client error:', err);
      setError('Unexpected error (client-side). Please try again.');
      setLoading(false);
    }
  }

  if (!plans.length) {
    return (
      <p className="text-sm text-red-700">
        No junior membership plans are currently available online for this club.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <h2 className="font-semibold">Junior player membership</h2>

      {/* Household details */}
      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Parent / guardian e-mail
        </label>
        <input
          type="email"
          required
          className="w-full border rounded px-3 py-2 text-sm"
          value={householdEmail}
          onChange={(e) => setHouseholdEmail(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium">
          Household name (optional)
        </label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2 text-sm"
          value={householdName}
          onChange={(e) => setHouseholdName(e.target.value)}
          placeholder="e.g. Lawler Family"
        />
      </div>

      <hr className="my-3" />

      {/* Juniors list */}
      <div className="space-y-4">
        {juniors.map((junior, index) => (
          <div
            key={index}
            className="border rounded-lg p-3 space-y-3 bg-gray-50/60"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Junior {index + 1}</h3>
              {juniors.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeJunior(index)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">First name</label>
              <input
                type="text"
                required={index === 0}
                className="w-full border rounded px-3 py-2 text-sm"
                value={junior.first_name}
                onChange={(e) =>
                  updateJunior(index, { first_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Last name</label>
              <input
                type="text"
                required={index === 0}
                className="w-full border rounded px-3 py-2 text-sm"
                value={junior.last_name}
                onChange={(e) =>
                  updateJunior(index, { last_name: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Date of birth</label>
              <input
                type="date"
                required={index === 0}
                className="w-full border rounded px-3 py-2 text-sm"
                value={junior.date_of_birth}
                onChange={(e) =>
                  updateJunior(index, { date_of_birth: e.target.value })
                }
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Gender</label>
              <select
                required={index === 0}
                className="w-full border rounded px-3 py-2 text-sm"
                value={junior.gender}
                onChange={(e) =>
                  updateJunior(index, { gender: e.target.value })
                }
              >
                <option value="" disabled>
                  Select sex...
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Junior membership plan
              </label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={junior.plan_id}
                onChange={(e) =>
                  updateJunior(index, { plan_id: e.target.value })
                }
              >
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addJunior}
          className="text-xs text-blue-700 hover:underline"
        >
          + Add another junior
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-50"
      >
        {loading
          ? 'Redirecting to payment…'
          : juniors.length === 1
          ? 'Continue to payment'
          : `Continue to payment for ${juniors.length} juniors`}
      </button>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </form>
  );
}
