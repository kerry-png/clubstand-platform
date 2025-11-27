// app/household/[householdId]/members/[memberId]/edit/EditMemberForm.tsx
'use client';

import { useState, type FormEvent } from 'react';

type MemberType = 'player' | 'supporter' | 'coach' | 'member';

type Props = {
  householdId: string;
  memberId: string;
  initialValues: {
    first_name: string;
    last_name: string;
    date_of_birth: string;
    gender: string;
    member_type: MemberType;
    email: string;
    phone: string;
  };
};

export default function EditMemberForm({
  householdId,
  memberId,
  initialValues,
}: Props) {
  const [firstName, setFirstName] = useState(initialValues.first_name);
  const [lastName, setLastName] = useState(initialValues.last_name);
  const [dob, setDob] = useState(initialValues.date_of_birth);
  const [gender, setGender] = useState(initialValues.gender);
  const [memberType, setMemberType] = useState<MemberType>(
    initialValues.member_type,
  );
  const [email, setEmail] = useState(initialValues.email);
  const [phone, setPhone] = useState(initialValues.phone);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        `/api/households/${householdId}/members/${memberId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            date_of_birth: dob || null,
            gender: gender || null,
            member_type: memberType,
            email: email.trim() || null,
            phone: phone.trim() || null,
          }),
        },
      );

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // ignore JSON parse errors
      }

      if (!res.ok) {
        throw new Error(
          data?.error ||
            data?.details ||
            'We could not save this member. Please try again.',
        );
      }

      setMessage('Member details updated.');
      setTimeout(() => {
        window.location.href = `/household/${householdId}`;
      }, 600);
    } catch (err: any) {
      console.error('Edit member error', err);
      setError(err.message || 'Unexpected error saving member.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
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
          Date of birth (optional)
          <input
            type="date"
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

      <label className="block text-sm">
        Member type
        <select
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
          value={memberType}
          onChange={(e) => setMemberType(e.target.value as MemberType)}
        >
          <option value="player">Player</option>
          <option value="supporter">Social / supporter</option>
          <option value="coach">Coach</option>
          <option value="member">Member</option>
        </select>
      </label>

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
      {message && <p className="text-sm text-green-700">{message}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() =>
            (window.location.href = `/household/${householdId}`)
          }
          className="px-3 py-2 rounded border border-gray-300 text-xs text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
