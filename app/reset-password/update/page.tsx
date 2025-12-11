// app/reset-password/update/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordUpdatePage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!password || !confirm) {
      setError('Please enter and confirm your new password.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(
          updateError.message ||
            'We could not update your password. Please try again.',
        );
      } else {
        setMessage('Your password has been updated. You can now sign in.');
        // Optional: redirect after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="max-w-md mx-auto mt-10 bg-white rounded-lg shadow-sm p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="text-sm text-slate-600">
          Enter a new password for your account.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        {message && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            New password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Confirm new password
          </label>
          <input
            type="password"
            autoComplete="new-password"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={submitting}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Updating password…' : 'Update password'}
        </button>
      </form>
    </main>
  );
}
