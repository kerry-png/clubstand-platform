// app/household/[householdId]/edit/EditHouseholdForm.tsx
'use client';

import { useState, type FormEvent } from 'react';

type Props = {
  householdId: string;
  initialValues: {
    name: string;
    primary_email: string;
    phone: string;
    address_line1: string;
    address_line2: string;
    town_city: string;
    postcode: string;
  };
};

export default function EditHouseholdForm({ householdId, initialValues }: Props) {
  const [name, setName] = useState(initialValues.name);
  const [primaryEmail, setPrimaryEmail] = useState(initialValues.primary_email);
  const [phone, setPhone] = useState(initialValues.phone);
  const [address1, setAddress1] = useState(initialValues.address_line1);
  const [address2, setAddress2] = useState(initialValues.address_line2);
  const [townCity, setTownCity] = useState(initialValues.town_city);
  const [postcode, setPostcode] = useState(initialValues.postcode);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!primaryEmail.trim()) {
      setError('Primary e-mail address is required.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/households/${householdId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || null,
          primary_email: primaryEmail.trim(),
          phone: phone.trim() || null,
          address_line1: address1.trim() || null,
          address_line2: address2.trim() || null,
          town_city: townCity.trim() || null,
          postcode: postcode.trim() || null,
        }),
      });

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
            'We could not save your household details. Please try again.',
        );
      }

      setMessage('Household details updated.');
      // Small delay then go back to dashboard
      setTimeout(() => {
        window.location.href = `/household/${householdId}`;
      }, 600);
    } catch (err: any) {
      console.error('Edit household error', err);
      setError(err.message || 'Unexpected error saving details.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          Household name (optional)
          <input
            type="text"
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Smith family household"
          />
        </label>

        <label className="block text-sm">
          Primary e-mail
          <input
            type="email"
            required
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={primaryEmail}
            onChange={(e) => setPrimaryEmail(e.target.value)}
          />
        </label>
      </div>

      <label className="block text-sm">
        Phone (optional)
        <input
          type="tel"
          className="mt-1 w-full border rounded px-3 py-2 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          Address line 1 (optional)
          <input
            type="text"
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Address line 2 (optional)
          <input
            type="text"
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={address2}
            onChange={(e) => setAddress2(e.target.value)}
          />
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          Town / city (optional)
          <input
            type="text"
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={townCity}
            onChange={(e) => setTownCity(e.target.value)}
          />
        </label>

        <label className="block text-sm">
          Postcode (optional)
          <input
            type="text"
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
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
          onClick={() => (window.location.href = `/household/${householdId}`)}
          className="px-3 py-2 rounded border border-gray-300 text-xs text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>

      <p className="text-xs text-gray-500">
        Updating these details won&apos;t change your login e-mail. If you need
        to change the address you use to sign in, please contact the club.
      </p>
    </form>
  );
}
