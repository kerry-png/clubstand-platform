'use client';

import { useState, type FormEvent } from 'react';

type MemberType = 'player' | 'supporter';

type Props = {
  clubId: string;
  householdId: string;
  initialType?: MemberType;
};

export default function AddMemberForm({
  clubId,
  householdId,
  initialType = 'player',
}: Props) {
  const [memberType] = useState<MemberType>(initialType);
  const isPlayer = memberType === 'player';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter a first name and last name.');
      return;
    }

    if (isPlayer && !dob) {
      setError('Please enter a date of birth for playing members.');
      return;
    }

    if (!clubId || !householdId) {
      setError('Missing club or household in the form. Please try again.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/households/${householdId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubId,
          householdId,
          member: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            date_of_birth: isPlayer ? dob : null,
            gender: isPlayer ? gender || null : null,
            email: email || null,
            phone: phone || null,
            member_type: memberType, // 'player' or 'supporter'
          },
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse error, we only care if res.ok
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.details ||
            'Failed to add family member. Please try again.',
        );
      }

      setSuccess('Family member added successfully.');
      // Simple redirect back to household dashboard
      window.location.href = `/household/${householdId}`;
    } catch (err: any) {
      console.error('Add member error', err);
      setError(err.message || 'Unexpected error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <p className="text-sm text-gray-700">
        {isPlayer
          ? 'Add a playing member (junior or adult). The club will work out the correct membership based on age and their rules.'
          : 'Add a social / non-playing member linked to your household.'}
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

      {isPlayer && (
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
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          E-mail (optional)
          <input
            type="email"
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Phone (optional)
          <input
            type="tel"
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
      >
        {submitting ? 'Saving…' : 'Save member'}
      </button>
    </form>
  );
}
