// app/club/[slug]/join/SelfDetailsForm.tsx
'use client';

import { useState, type FormEvent } from 'react';

type Props = {
  clubId: string;
  planId: string;
  planName: string;
  planPricePennies: number;
  defaultEmail: string;
};

export default function SelfDetailsForm({
  clubId,
  planId,
  planName,
  planPricePennies,
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
    return formatted.endsWith('.00')
      ? `£${formatted.slice(0, -3)}`
      : `£${formatted}`;
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!firstName || !lastName || !dob) {
      setFormError('Please fill in your name and date of birth.');
      return;
    }

    setLoading(true);

    try {
      // For this self-join flow we treat it as an adult / annual plan.
      // Membership year: default to "next season" (same logic as stats fallback).
      const now = new Date();
      const defaultMembershipYear = now.getFullYear() + 1;
      const membershipYear = defaultMembershipYear;
      const billingPeriod: 'annual' = 'annual';

      // 1) Create household, member, and pending subscription
      const startRes = await fetch('/api/memberships/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          planId,
          userEmail: email,
          billingPeriod,
          membershipYear,
          member: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            date_of_birth: dob,
            gender: gender || null,
            phone: phone || null,
          },
        }),
      });

      let startData: any = null;
      try {
        startData = await startRes.json();
      } catch (err) {
        console.error('Failed to parse JSON from /api/memberships/start', err);
      }

      if (!startRes.ok) {
        setFormError(
          startData?.error ||
            startData?.details ||
            'Something went wrong starting your membership.',
        );
        setLoading(false);
        return;
      }

      const householdId = startData?.householdId as string | undefined;

      if (!householdId) {
        console.error(
          'Membership start API did not return householdId:',
          startData,
        );
        setFormError(
          'Membership created, but we could not continue (missing household ID).',
        );
        setLoading(false);
        return;
      }

      // 2) Redirect to household setup page instead of going straight to payment
      window.location.href = `/household/${householdId}?setup=1`;
    } catch (err) {
      console.error('Unexpected client error:', err);
      setFormError('Unexpected error (client-side). Please try again.');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 border rounded-lg p-4">
      <p className="text-sm text-gray-700">
        You are purchasing{' '}
        <span className="font-semibold">
          {planName} ({formatPrice(planPricePennies)})
        </span>{' '}
        for yourself. You&apos;ll be able to add family members later from your
        household dashboard.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          First name
          <input
            type="text"
            required
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Last name
          <input
            type="text"
            required
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          Date of birth
          <input
            type="date"
            required
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Gender (optional)
          <select
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other / non-binary</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          Contact phone (optional)
          <input
            type="tel"
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Email
          <input
            type="email"
            disabled
            className="mt-1 w-full border rounded px-3 py-2 text-sm bg-gray-100 text-gray-600"
            value={email}
          />
          <span className="block mt-1 text-xs text-gray-500">
            This is the email you&apos;re signed in with.
          </span>
        </label>
      </div>

      {formError && (
        <p className="text-sm text-red-600" role="alert">
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-60"
      >
        {loading ? 'Starting membership…' : 'Continue'}
      </button>
    </form>
  );
}
