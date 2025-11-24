// app/membership/thank-you/page.tsx

type ThankYouPageProps = {
  searchParams?: { [key: string]: string | string[] | undefined };
};

export default function ThankYouPage({ searchParams }: ThankYouPageProps) {
  const sessionId = searchParams?.session_id;

  return (
    <div className="max-w-xl mx-auto py-10 px-4 space-y-4">
      <h1 className="text-2xl font-semibold">Thank you for your payment</h1>

      <p className="text-sm text-gray-700">
        Your membership payment has been received. You&apos;ll get a confirmation
        e-mail from Stripe shortly.
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

      <a
        href="/"
        className="inline-flex items-center text-sm text-blue-700 hover:underline mt-4"
      >
        Back to homepage
      </a>
    </div>
  );
}
