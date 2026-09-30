// app/(app)/admin/clubs/[clubId]/membership-setup/MembershipSetupClient.tsx

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Setup = {
  joining_route: 'invite' | 'open' | 'approval';
  allow_non_member_account_holder: boolean;
  junior_age_under: number;
  age_assessment_month: number;
  age_assessment_day: number;
  mid_season_treatment: 'full' | 'prorata' | 'trial' | 'manual';
  trial_days: number;
  allow_annual: boolean;
  allow_monthly: boolean;
  allow_offline: boolean;
  membership_year_start_month: number;
  membership_year_start_day: number;
};

const defaults: Setup = {
  joining_route: 'invite',
  allow_non_member_account_holder: true,
  junior_age_under: 18,
  age_assessment_month: 8,
  age_assessment_day: 31,
  mid_season_treatment: 'manual',
  trial_days: 0,
  allow_annual: true,
  allow_monthly: true,
  allow_offline: true,
  membership_year_start_month: 9,
  membership_year_start_day: 1,
};

export default function MembershipSetupClient({
  clubId,
}: {
  clubId: string;
}) {
  const [s, setS] = useState(defaults);
  const [status, setStatus] = useState('Loading…');
  const [database, setDatabase] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(
          `/api/admin/clubs/${clubId}/membership-settings`,
          { cache: 'no-store' },
        );

        const j = await r.json();

        if (r.ok) {
          setS({ ...defaults, ...j.settings });
          setDatabase(true);
          setStatus('Saved per club');
        } else {
          setStatus('Could not load membership settings');
        }
      } catch {
        setStatus('Could not load membership settings');
      }
    })();
  }, [clubId]);

  const patch = (p: Partial<Setup>) => {
    setS((v) => ({ ...v, ...p }));
    setStatus('Unsaved changes');
  };

  async function save() {
    if (database) {
      const r = await fetch(
        `/api/admin/clubs/${clubId}/membership-settings`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(s),
        },
      );

      if (r.ok) {
        setStatus('Saved per club ✓');
        return;
      }

      setStatus('Could not save');
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Membership · Rules engine
        </p>

        <h1 className="mt-1 text-3xl font-semibold text-slate-950">
          Membership setup
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          ClubStand uses these rules everywhere: registration, eligibility,
          forms, renewals and membership changes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
         <Card
          title="Membership year"
          desc="Set when this club's membership year begins. Sport-specific season and age-group rules are configured separately."
        >
          <Label>Membership year starts</Label>

          <DatePair
            month={s.membership_year_start_month}
            day={s.membership_year_start_day}
            change={(month, day) =>
              patch({
                membership_year_start_month: month,
                membership_year_start_day: day,
              })
            }
          />

          <p className="text-xs text-slate-500">
            Membership eligibility belongs to each membership type. Sport-specific
            concepts such as playing age groups do not change this date.
          </p>
        </Card>

        <Card
          title="Registration access"
          desc="Choose who can start a membership registration for this club."
        >
          <Label>Who can start registration?</Label>

          <Select
            value={s.joining_route}
            onChange={(value) =>
              patch({ joining_route: value as Setup['joining_route'] })
            }
            options={[
              ['invite', 'Invitation only'],
              ['approval', 'Register interest + approval'],
              ['open', 'Open registration'],
            ]}
          />

          <Check
            checked={s.allow_non_member_account_holder}
            onChange={(value) =>
              patch({ allow_non_member_account_holder: value })
            }
            label="Account holder can manage a household without being a member"
          />
        </Card>

        <Card
          title="Joining part-way through the year"
          desc="A club can decide how late joiners are treated without changing code."
        >
          <Label>Default treatment</Label>

          <Select
            value={s.mid_season_treatment}
            onChange={(value) =>
              patch({
                mid_season_treatment:
                  value as Setup['mid_season_treatment'],
              })
            }
            options={[
              ['manual', 'Admin decides'],
              ['trial', 'Trial / deferred charge'],
              ['prorata', 'Pro-rata'],
              ['full', 'Full price'],
            ]}
          />

          {s.mid_season_treatment === 'trial' && (
            <>
              <Label>Default trial days</Label>

              <input
                className="field"
                type="number"
                min="0"
                max="365"
                value={s.trial_days}
                onChange={(e) =>
                  patch({ trial_days: +e.target.value })
                }
              />
            </>
          )}
        </Card>

        <Card
          title="Payment routes"
          desc="Individual plans can be more restrictive than these club-wide options."
        >
          <Check
            checked={s.allow_monthly}
            onChange={(value) => patch({ allow_monthly: value })}
            label="Monthly online"
          />

          <Check
            checked={s.allow_annual}
            onChange={(value) => patch({ allow_annual: value })}
            label="Annual online"
          />

          <Check
            checked={s.allow_offline}
            onChange={(value) => patch({ allow_offline: value })}
            label="Offline / manual"
          />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Jump
          href={`/admin/clubs/${clubId}/plans`}
          title="Membership types & prices"
          text="Define playing, social, junior and household memberships."
        />

        <Jump
          href={`/admin/clubs/${clubId}/safeguarding`}
          title="Forms, policies & consents"
          text="Choose what each person or guardian must complete."
        />

        <Jump
          href={`/admin/clubs/${clubId}/settings/admins`}
          title="Roles & access"
          text="Separate finance access from sensitive member information."
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
        >
          Save membership rules
        </button>

        <span className="text-sm text-slate-600">{status}</span>
      </div>

    </div>
  );
}

function Card({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <p className="mb-4 mt-1 text-xs leading-5 text-slate-500">{desc}</p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-700">
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <select
      className="field"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex gap-3 rounded-xl border border-slate-200 p-3 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Jump({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-400"
    >
      <span className="font-semibold text-slate-950">{title} →</span>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </Link>
  );
}

function DatePair({
  month,
  day,
  change,
}: {
  month: number;
  day: number;
  change: (month: number, day: number) => void;
}) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      <select
        className="field"
        value={month}
        onChange={(e) => change(+e.target.value, day)}
      >
        {months.map((name, index) => (
          <option key={name} value={index + 1}>
            {name}
          </option>
        ))}
      </select>

      <input
        className="field"
        type="number"
        min="1"
        max="31"
        value={day}
        onChange={(e) => change(month, +e.target.value)}
      />
    </div>
  );
}