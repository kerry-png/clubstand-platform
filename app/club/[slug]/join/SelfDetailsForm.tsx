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
      const now = new Date();
      const membershipYear = now.getFullYear() + 1;

      const startRes = await fetch('/api/memberships/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          planId,
          userEmail: email,
          billingPeriod: 'annual',
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

      const startData = await startRes.json().catch(() => null);

      if (!startRes.ok) {
        setFormError(
          startData?.error ||
            startData?.details ||
            'Something went wrong starting your membership.'
        );
        setLoading(false);
        return;
      }

      const householdId = startData?.householdId as string | undefined;

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
    <form onSubmit={handleSubmit} className="space-y-5 border rounded-lg p-4">
      <p className="text-sm text-gray-700">
        You are purchasing{' '}
        <span className="font-semibold">
          {planName} ({formatPrice(planPricePennies)})
        </span>{' '}
        for yourself.
      </p>

      {/* Form fields unchanged… */}

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
