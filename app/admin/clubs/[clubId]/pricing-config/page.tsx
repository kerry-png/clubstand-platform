// app/admin/clubs/[clubId]/pricing-config/page.tsx

import { supabaseServerClient } from '@/lib/supabaseServer';
import {
  type ClubPricingConfig,
  DEFAULT_RAINHILL_2026_CONFIG,
} from '@/lib/pricing/rainhill2026';
import PricingConfigForm from './PricingConfigForm';

type PageProps = {
  params: { clubId: string } | Promise<{ clubId: string }>;
  searchParams?: { [key: string]: string | string[] | undefined };
};

function parseYearFromSearch(
  searchParams?: { [key: string]: string | string[] | undefined },
): number {
  const fallback = 2026;
  if (!searchParams) return fallback;
  const raw = searchParams.year;
  const str = Array.isArray(raw) ? raw[0] : raw;
  if (!str) return fallback;
  const parsed = Number(str);
  return Number.isFinite(parsed) && parsed > 1900 ? parsed : fallback;
}

export default async function ClubPricingConfigPage(props: PageProps) {
  const resolvedParams =
    (props.params as any)?.then &&
    typeof (props.params as any).then === 'function'
      ? await props.params
      : (props.params as { clubId: string });

  const clubId = resolvedParams.clubId;
  const membershipYear = parseYearFromSearch(props.searchParams);

  const supabase = supabaseServerClient;

  // Load club basic info (name, slug, support_code)
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .select('name, short_name, slug, support_code')
    .eq('id', clubId)
    .maybeSingle();

  if (clubError) {
    console.error('Admin pricing-config: club load error', clubError);
  }

  const clubName =
    club?.name || club?.short_name || club?.slug || 'Club';
  const supportCode = club?.support_code as string | undefined;

  // Load existing config if present
  const { data: existingConfig, error: cfgError } = await supabase
    .from('club_pricing_config')
    .select('*')
    .eq('club_id', clubId)
    .eq('membership_year', membershipYear)
    .maybeSingle();

  if (cfgError) {
    console.error('Admin pricing-config page load error', cfgError);
  }

  // If no row yet, start from engine defaults
  const initialConfig: ClubPricingConfig =
    existingConfig ??
    ({
      ...DEFAULT_RAINHILL_2026_CONFIG,
    } as ClubPricingConfig);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">
          Membership pricing configuration
        </h1>
        <p className="text-sm text-slate-700">
          <span className="font-medium">{clubName}</span>
          {supportCode && (
            <>
              {' '}
              · Support code:{' '}
              <span className="font-mono text-slate-900">
                {supportCode}
              </span>
            </>
          )}
          {' '}
          · Year:{' '}
          <span className="font-mono text-slate-900">
            {membershipYear}
          </span>
        </p>
        {!supportCode && club && (
          <p className="text-xs text-slate-500">
            Tip: set a friendly support code (e.g. CR1) on this club in
            the database so your admins can quote it when they need help.
          </p>
        )}
        <p className="mt-3 text-sm text-slate-700">
          Adjust age boundaries, adult bundle rules and price bands for
          this club and membership year. Prices are edited in pounds
          (e.g. <code>115.00</code>) and stored as pennies internally.
        </p>
        {!existingConfig && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            No existing config found for this club and year. The form
            below is prefilled with the default engine values – update as
            needed and save to create a config row.
          </p>
        )}
      </div>

      <PricingConfigForm
        clubId={clubId}
        membershipYear={membershipYear}
        initialConfig={initialConfig}
        hasExistingRow={!!existingConfig}
      />
    </div>
  );
}
