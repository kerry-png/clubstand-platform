// app/signup/page.tsx
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmations are disabled, user will be logged in
    // and we can go straight to the dashboard.
    // If they’re enabled, you may prefer to send them to /login instead.
    router.push('/dashboard');
  }

  return (
    <main className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-3xl font-semibold mb-2">Create your ClubStand account</h1>
      <p className="text-sm text-gray-600 mb-6">
        One login for memberships, LMS, Hundred Club and more at your club.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            required
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Confirm password</label>
          <input
            type="password"
            required
            minLength={6}
            className="w-full border rounded px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm">
        Already have an account?{' '}
        <button
          type="button"
          className="underline"
          onClick={() => router.push('/login')}
        >
          Log in
        </button>
      </p>
    </main>
  );
}
