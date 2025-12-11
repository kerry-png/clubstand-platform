// app/reset-password/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default function ResetPasswordRequestPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setSubmitting(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${SITE_URL}/reset-password/update`,
        },
      );

      if (resetError) {
        setError(
          resetError.message ||
            'We could not send a reset link. Please try again.',
        );
      } else {
        setMessage(
          'If that email address is registered, you will receive a password reset link shortly.',
        );
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
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="text-sm text-slate-600">
          Enter the email address you use to sign in. We will send you a link
          to set a new password.
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
            Email address
          </label>
          <input
            type="email"
            autoComplete="email"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Sending reset link…' : 'Send reset link'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => router.push('/login')}
        className="text-xs text-slate-600 underline underline-offset-2 hover:text-slate-900"
      >
        Back to sign in
      </button>
    </main>
  );
}
