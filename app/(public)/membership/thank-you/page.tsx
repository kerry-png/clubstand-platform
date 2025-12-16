// app/membership/thank-you/page.tsx
import Link from 'next/link';

type ThankYouPageProps = {
  // In Next 16, searchParams is a Promise on the server
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ThankYouPage({ searchParams }: ThankYouPageProps) {
  const params = await searchParams;

  const raw = params?.session_id;
  const sessionId = Array.isArray(raw) ? raw[0] : raw;

  return (
    <main className="max-w-xl mx-auto py-10 px-4 space-y-4">
      <h1 className="text-2xl font-semibold">Thank you for your payment</h1>

      <p className="text-sm text-gray-700">
        Your membership payment has been received. You&apos;ll get a confirmation
        email from Stripe shortly.
      </p>

      <p className="text-sm text-gray-700">
        The club will now review and confirm your membership. If you have any
        questions, please contact the club directly.
      </p>

      {sessionId && (
        <p className="text-xs text-gray-500">
          Payment reference: <span className="font-mono">{sessionId}</span>
        </p>
      )}

      <div className="mt-6 space-y-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-black text-white text-sm"
        >
          Go to my portal
        </Link>

        <Link
          href="/"
          className="block text-sm text-blue-700 hover:underline"
        >
          Back to homepage
        </Link>
      </div>
    </main>
  );
}
