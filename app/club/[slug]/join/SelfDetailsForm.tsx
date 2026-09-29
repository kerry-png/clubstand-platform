'use client';

import { useState, type FormEvent } from 'react';

type Props = {
  clubId: string;
  planId: string;
  planName: string;
  planPricePennies: number;
  isJuniorPlan: boolean;
  defaultEmail: string;
};

export default function SelfDetailsForm({
  clubId,
  planId,
  planName,
  planPricePennies,
  isJuniorPlan,
  defaultEmail,
}: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [email] = useState(defaultEmail);
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const formatPrice = (pennies: number) => {
    const pounds = pennies / 100;
    const formatted = pounds.toFixed(2);
    return formatted.endsWith('.00') ? `£${formatted.slice(0, -3)}` : `£${formatted}`;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!firstName.trim() || !lastName.trim() || !dob) {
      setFormError('Please fill in your name and date of birth.');
      return;
    }

    // Eligibility and membership year are validated server-side from the club's settings.

    // For now, align billing period to the plan type
    // (we can make this user-selectable later using allow_annual/allow_monthly)
    const billingPeriod = isJuniorPlan ? 'monthly' : 'annual';

    setLoading(true);

    try {
      const res = await fetch('/api/memberships/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          planId,
          userEmail: email,
          billingPeriod,
          member: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            date_of_birth: dob,
            gender: gender || null,
            phone: phone || null,
          },
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFormError(
          data?.error ||
            data?.details ||
            'Something went wrong starting your membership.',
        );
        setLoading(false);
        return;
      }

      const householdId = data?.householdId as string | undefined;

      if (!householdId) {
        setFormError('Membership created, but missing household ID.');
        setLoading(false);
        return;
      }

      window.location.href = `/household/${householdId}?setup=1`;
    } catch (err) {
      console.error(err);
      setFormError('Unexpected error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 border rounded-lg p-4 bg-white">
      <p className="text-sm text-gray-700">
        You are purchasing{' '}
        <span className="font-semibold">
          {planName} ({formatPrice(planPricePennies)})
        </span>{' '}
        for yourself.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">First name</label>
          <input
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="given-name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Last name</label>
          <input
            type="text"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="family-name"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">Date of birth</label>
          <input
            type="date"
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
          <p className="mt-1 text-xs text-slate-500">
            Junior eligibility is based on the age rules set by your club.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium mb-1">
            Email (for your account)
          </label>
          <input
            type="email"
            disabled
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
            value={email}
            readOnly
          />
          <p className="mt-1 text-xs text-slate-500">
            This is your login email. You&apos;ll be able to update your contact details later.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Mobile number (optional)
          </label>
          <input
            type="tel"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>

      {formError && (
        <p className="text-sm text-red-600" role="alert">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        style={{ background: 'var(--brand-primary)' }}
      >
        {loading ? 'Starting membership…' : 'Continue'}
      </button>
    </form>
  );
}
