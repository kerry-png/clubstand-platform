'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

type InvitationStatus =
  | 'draft'
  | 'sent'
  | 'opened'
  | 'in_progress'
  | 'completed'
  | 'expired'
  | 'revoked';

type Invitation = {
  id: string;
  season_year: number;
  account_holder_first_name: string;
  account_holder_last_name: string;
  email: string;
  internal_note: string | null;
  status: InvitationStatus;
  expires_at: string;
  sent_at: string | null;
  opened_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

const statusStyles: Record<InvitationStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  sent: 'bg-blue-100 text-blue-700',
  opened: 'bg-violet-100 text-violet-700',
  in_progress: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-700',
  expired: 'bg-orange-100 text-orange-800',
  revoked: 'bg-red-100 text-red-700',
};

const statusLabels: Record<InvitationStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  opened: 'Opened',
  in_progress: 'In progress',
  completed: 'Completed',
  expired: 'Expired',
  revoked: 'Revoked',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export default function InvitationsClient({ clubId }: { clubId: string }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [existingHouseholdId, setExistingHouseholdId] = useState<string | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadInvitations = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/invitations`, {
        cache: 'no-store',
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) throw new Error(json?.error || 'Failed to load invitations.');
      setInvitations(json.invitations ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load invitations.');
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  async function createInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setExistingHouseholdId(null);
    setNewLink(null);
    setCopied(false);

    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, internalNote }),
      });
      const json = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 409 && json?.householdId) {
          setExistingHouseholdId(json.householdId);
          setFormError(json?.error || 'This email address is already connected to a household.');
          return;
        }
        throw new Error(json?.error || 'Failed to create invitation.');
      }

      setNewLink(json.invitationUrl);
      setFirstName('');
      setLastName('');
      setEmail('');
      setInternalNote('');
      await loadInvitations();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to create invitation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!newLink) return;
    await navigator.clipboard.writeText(newLink);
    setCopied(true);
  }

  async function revokeInvitation(invitation: Invitation) {
    const name = `${invitation.account_holder_first_name} ${invitation.account_holder_last_name}`;
    if (!window.confirm(`Revoke the invitation for ${name}?`)) return;

    const response = await fetch(
      `/api/admin/clubs/${clubId}/invitations/${invitation.id}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'revoke' }),
      },
    );
    const json = await response.json().catch(() => null);
    if (!response.ok) {
      window.alert(json?.error || 'Failed to revoke the invitation.');
      return;
    }
    await loadInvitations();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="font-medium text-slate-900">Approved a new household?</p>
          <p className="text-sm text-slate-600">
            Create their private sign-up link. No household record is created yet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (showForm) {
              setFirstName('');
              setLastName('');
              setEmail('');
              setInternalNote('');
            }
            setShowForm(!showForm);
            setFormError(null);
            setExistingHouseholdId(null);
            setNewLink(null);
          }}
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ background: 'var(--brand-primary)' }}
        >
          {showForm ? 'Close form' : 'New invitation'}
        </button>
      </div>

      {showForm && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">New household invitation</h2>
          <p className="mt-1 text-sm text-slate-600">
            Only use this form if the household does not already have a ClubStand record.
            Enter the details of the adult who will manage the new account.
          </p>

          <form onSubmit={createInvitation} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">
                First name <span className="text-red-600">*</span>
                <input
                  required
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900"
                />
              </label>
              <label className="space-y-1 text-sm font-medium text-slate-700">
                Surname <span className="text-red-600">*</span>
                <input
                  required
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900"
                />
              </label>
            </div>

            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Email address <span className="text-red-600">*</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900"
              />
            </label>

            <label className="block space-y-1 text-sm font-medium text-slate-700">
              Internal note <span className="font-normal text-slate-500">(optional)</span>
              <textarea
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                rows={3}
                placeholder="For example: Junior enquiry for Sam – U11"
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal text-slate-900"
              />
              <span className="block text-xs font-normal text-slate-500">
                Club administrators can see this note. It is not shown to the recipient.
              </span>
            </label>

            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
                <p>{formError}</p>
                {existingHouseholdId && (
                  <Link
                    href={`/household/${existingHouseholdId}`}
                    className="mt-2 inline-flex rounded-lg border border-red-300 bg-white px-3 py-2 font-medium text-red-800 hover:bg-red-100"
                  >
                    View household
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ background: 'var(--brand-primary)' }}
            >
              {submitting ? 'Creating invitation…' : 'Create invitation'}
            </button>
          </form>

          {newLink && (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-medium text-emerald-900">Invitation created</p>
              <p className="mt-1 text-sm text-emerald-800">
                Copy this private link now. For security, the complete link is not stored.
              </p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={newLink}
                  className="min-w-0 flex-1 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={copyLink}
                  className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-medium text-emerald-800"
                >
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Invitations</h2>
          <p className="text-sm text-slate-600">Track every household invited to join.</p>
        </div>

        {loading && <p className="p-5 text-sm text-slate-600">Loading invitations…</p>}
        {loadError && <p className="p-5 text-sm text-red-700">{loadError}</p>}
        {!loading && !loadError && invitations.length === 0 && (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-800">No invitations yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Your first approved household will appear here.
            </p>
          </div>
        )}

        {!loading && !loadError && invitations.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Account holder</th>
                  <th className="px-5 py-3 font-medium">Season</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((invitation) => {
                  const active = ['draft', 'sent', 'opened', 'in_progress'].includes(invitation.status);
                  return (
                    <tr key={invitation.id} className="align-top">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {invitation.account_holder_first_name} {invitation.account_holder_last_name}
                        </p>
                        <p className="text-slate-600">{invitation.email}</p>
                        {invitation.internal_note && (
                          <p className="mt-1 max-w-md text-xs text-slate-500">
                            {invitation.internal_note}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{invitation.season_year}</td>
                      <td className="px-5 py-4 text-slate-700">{formatDate(invitation.created_at)}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[invitation.status]}`}>
                          {statusLabels[invitation.status]}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {active && (
                          <button
                            type="button"
                            onClick={() => revokeInvitation(invitation)}
                            className="text-sm font-medium text-red-700 hover:underline"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
