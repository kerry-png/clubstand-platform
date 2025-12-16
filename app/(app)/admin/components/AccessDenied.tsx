// app/admin/components/AccessDenied.tsx

import Link from "next/link";

type Props = {
  clubName: string;
  clubId: string;
  message?: string;
};

export default function AccessDenied({ clubName, clubId, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">

      {/* Icon */}
      <div className="rounded-full bg-red-100 text-red-600 w-20 h-20 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z"
          />
        </svg>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-semibold text-slate-900">
        Access Denied
      </h1>

      {/* Message */}
      <p className="text-sm text-slate-600 max-w-md">
        {message ??
          "You do not have permission to view this page. Please contact a club super admin if you believe this is incorrect."}
      </p>

      {/* Club context */}
      <p className="text-xs text-slate-500">
        Club: <span className="font-medium">{clubName}</span>
      </p>

      {/* Back link */}
      <Link
        href={`/admin/clubs/${clubId}/dashboard`}
        className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white rounded-md text-sm hover:bg-slate-800"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
