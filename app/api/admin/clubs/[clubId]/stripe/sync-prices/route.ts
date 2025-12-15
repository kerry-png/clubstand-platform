import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentAdminForClub } from '@/lib/admins';
import { canViewPayments } from '@/lib/permissions';

type Params = { clubId: string };
type Props = { params: Promise<Params> };

export async function POST(_req: Request, { params }: Props) {
  const { clubId } = await params;

  const admin = await getCurrentAdminForClub(null as any, clubId);
  if (!admin || !canViewPayments(admin)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const { data: club } = await supabaseServerClient
    .from('clubs')
    .select('id, name, stripe_account_id')
    .eq('id', clubId)
    .single();

  if (!club?.stripe_account_id) {
    return NextResponse.json({ error: 'Stripe not connected' }, { status: 400 });
  }

  const { data: plans } = await supabaseServerClient
    .from('membership_plans')
    .select('*')
    .eq('club_id', clubId)
    .eq('is_active', true);

  if (!plans || plans.length === 0) {
    return NextResponse.json({ error: 'No active plans found' }, { status: 400 });
  }

  for (const plan of plans) {
    // Create product per plan
    const product = await stripe.products.create(
      {
        name: plan.name,
        metadata: {
          club_id: clubId,
          plan_id: plan.id,
        },
      },
      { stripeAccount: club.stripe_account_id },
    );

    const updates: any = {};

    if (plan.allow_annual && plan.annual_price_pennies) {
      const annual = await stripe.prices.create(
        {
          product: product.id,
          unit_amount: plan.annual_price_pennies,
          currency: 'gbp',
          recurring: { interval: 'year' },
        },
        { stripeAccount: club.stripe_account_id },
      );

      updates.stripe_price_id_annual_connected = annual.id;
    }

    if (plan.allow_monthly && plan.monthly_price_pennies) {
      const monthly = await stripe.prices.create(
        {
          product: product.id,
          unit_amount: plan.monthly_price_pennies,
          currency: 'gbp',
          recurring: { interval: 'month' },
        },
        { stripeAccount: club.stripe_account_id },
      );

      updates.stripe_price_id_monthly_connected = monthly.id;
    }

    await supabaseServerClient
      .from('membership_plans')
      .update(updates)
      .eq('id', plan.id);
  }

  return NextResponse.json({ success: true });
}