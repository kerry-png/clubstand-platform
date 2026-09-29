// app/invitation/[invitationId]/register/page.tsx

type PageProps = {
  params: Promise<{ invitationId: string }>;
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function RegistrationPage({
  params,
  searchParams,
}: PageProps) {
  const { invitationId } = await params;
  const query = await searchParams;
  const token = Array.isArray(query.token) ? query.token[0] : query.token;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Create your account
        </h1>

        <p className="mt-3 text-slate-600">
          Registration page connected successfully.
        </p>

        <p className="mt-4 text-xs text-slate-400">
          Invitation: {invitationId}
          <br />
          Secure token: {token ? 'Received' : 'Missing'}
        </p>
      </section>
    </main>
  );
}