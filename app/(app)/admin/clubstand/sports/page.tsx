// app/(app)/admin/clubstand/sports/page.tsx

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import { supabaseServerClient } from '@/lib/supabaseServer';

function normaliseKey(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export default async function SportsPage() {
  await requirePlatformAdmin({ redirectTo: '/admin/clubstand/sports' });

  const { data: sports, error } = await supabaseServerClient
    .from('sports')
    .select('id,key,name,description,is_active,capabilities')
    .order('name');

  async function addSport(formData: FormData) {
    'use server';
    await requirePlatformAdmin({ redirectTo: '/admin/clubstand/sports' });

    const name = String(formData.get('name') ?? '').trim();
    const key = normaliseKey(String(formData.get('key') ?? '') || name);
    const description = String(formData.get('description') ?? '').trim() || null;

    if (!name || !key) redirect('/admin/clubstand/sports?error=missing');

    const { error: insertError } = await supabaseServerClient.from('sports').insert({
      name,
      key,
      description,
      is_active: true,
    });

    if (insertError) {
      console.error('Create sport failed', insertError);
      redirect('/admin/clubstand/sports?error=create');
    }

    revalidatePath('/admin/clubstand/sports');
    revalidatePath('/admin/clubstand/clubs/new');
    redirect('/admin/clubstand/sports');
  }

  async function updateSport(formData: FormData) {
    'use server';
    await requirePlatformAdmin({ redirectTo: '/admin/clubstand/sports' });

    const id = String(formData.get('id') ?? '').trim();
    const name = String(formData.get('name') ?? '').trim();
    const description = String(formData.get('description') ?? '').trim() || null;
    const isActive = formData.get('is_active') === 'on';

    if (!id || !name) redirect('/admin/clubstand/sports?error=missing');

    const { error: updateError } = await supabaseServerClient
      .from('sports')
      .update({ name, description, is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      console.error('Update sport failed', updateError);
      redirect('/admin/clubstand/sports?error=update');
    }

    revalidatePath('/admin/clubstand/sports');
    revalidatePath('/admin/clubstand/clubs/new');
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Platform configuration</p>
        <h1 className="mt-1 text-2xl font-semibold">Sports &amp; activities</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-600">
          Define the sports ClubStand can support. A club chooses one of these when it is created; sport-specific features can then sit on top of the shared ClubStand core.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-800">Sports could not be loaded.</p>
      )}

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Add sport or activity</h2>
        <form action={addSport} className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Name
            <input name="name" required className="field mt-1" placeholder="Cricket" />
          </label>
          <label className="text-sm font-medium">
            Key <span className="font-normal text-slate-500">(optional)</span>
            <input name="key" className="field mt-1" placeholder="Auto-generated from name" />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Description <span className="font-normal text-slate-500">(optional)</span>
            <input name="description" className="field mt-1" placeholder="Short platform note about this sport" />
          </label>
          <div className="md:col-span-2">
            <button className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Add sport</button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        {(sports ?? []).map((sport) => (
          <form key={sport.id} action={updateSport} className="rounded-xl border bg-white p-5">
            <input type="hidden" name="id" value={sport.id} />
            <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end">
              <label className="text-sm font-medium">
                Name
                <input name="name" required defaultValue={sport.name} className="field mt-1" />
              </label>
              <label className="text-sm font-medium">
                Description
                <input name="description" defaultValue={sport.description ?? ''} className="field mt-1" />
              </label>
              <label className="flex h-10 items-center gap-2 rounded-lg border px-3 text-sm">
                <input name="is_active" type="checkbox" defaultChecked={sport.is_active} /> Active
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Key: <code>{sport.key}</code> · {(sport.capabilities ?? []).length} sport-specific capabilities configured
              </p>
              <button className="rounded-lg border px-3 py-2 text-xs font-semibold">Save changes</button>
            </div>
          </form>
        ))}
      </section>
    </div>
  );
}
