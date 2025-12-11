// app/reset-password/update/page.tsx
'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Status = 'checking' | 'ready' | 'error';

export default function ResetPasswordUpdatePage() {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<Status>('checking');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Checking your reset link…',
  );
  const [email, setEmail] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1) On mount: read tokens from hash, create Supabase session, fetch user
  useEffect(() => {
    async function initFromHash() {
      try {
        setError(null);
        setStatus('checking');
        setStatusMessage('Checking your reset link…');

        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : window.location.hash;

        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');

        if (!access_token || !refresh_token) {
          console.error(
            'Missing access_token or refresh_token in reset-password URL hash',
            hash,
          );
          setStatus('error');
          setStatusMessage(
            'This password reset link is invalid or has expired. Please request a new one.',
          );
          setError('Missing access token or refresh token in reset link.');
          return;
        }

        // Create a session from the tokens in the URL
        const { error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          console.error(
            'Failed to set Supabase session from reset link',
            sessionError,
          );
          setStatus('error');
          setStatusMessage(
            'There was a problem validating your reset link. Please request a new one.',
          );
          setError(sessionError.message);
          return;
        }

        // Now we should have a valid session – get the user (mainly for the email)
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError || !userData?.user) {
          console.error('Failed to load user for password reset', userError);
          setStatus('error');
          setStatusMessage(
            'There was a problem validating your reset link. Please request a new one.',
          );
          setError(userError?.message ?? 'Could not load user from reset link.');
          return;
        }

        setEmail(userData.user.email ?? null);
        setStatus('ready');
        setStatusMessage('');
      } catch (err: any) {
        console.error('Unexpected error initialising reset session', err);
        setStatus('error');
        setStatusMessage(
          'There was a problem validating your reset link. Please request a new one.',
        );
        setError(err?.message ?? 'Unexpected error initialising reset session.');
      }
    }

    initFromHash();
  }, [supabase]);

  // 2) Handle submit: update the password for the current (recovery) session
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (status !== 'ready') {
      setError('Your reset link has not been verified yet.');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        console.error('Error updating password', updateError);
        setError(
          updateError.message ||
            'There was a problem updating your password. Please try again.',
        );
        return;
      }

      setStatusMessage('Password updated successfully. Redirecting to sign in…');

      // Small delay so the user sees the success message, then send to login
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 1500);
    } catch (err: any) {
      console.error('Unexpected error updating password', err);
      setError(
        err?.message || 'There was a problem updating your password. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = status !== 'ready' || submitting;

  return (
    <main className="max-w-md mx-auto mt-10 bg-white rounded-lg shadow-sm p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        {status === 'checking' && (
          <p className="text-sm text-slate-600">{statusMessage}</p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-600">{statusMessage}</p>
        )}
        {status === 'ready' && (
          <p className="text-sm text-slate-600">
            {email
              ? `Resetting password for ${email}.`
              : 'Your reset link has been verified. Enter a new password below.'}
          </p>
        )}
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            New password
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">
            Confirm new password
          </label>
          <input
            type="password"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={disabled}
          />
        </div>

        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Updating password…' : 'Update password'}
        </button>
      </form>
    </main>
  );
}
