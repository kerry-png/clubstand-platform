// app/admin/clubs/[clubId]/ClubAdminShell.tsx
"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Theme = {
  clubId: string;
  clubName: string;
  slug: string;
  logoUrl: string | null;
  primary: string;
  secondary: string;
};

type Props = {
  children: ReactNode;
  theme: Theme;
};

export default function ClubAdminShell({ children, theme }: Props) {
  const pathname = usePathname();
  const basePath = `/admin/clubs/${theme.clubId}`;

  const navItems = [
    { href: `${basePath}/dashboard`, label: "Dashboard" },
    { href: `${basePath}/juniors`, label: "Juniors" },
    { href: `${basePath}/plans`, label: "Plans & pricing" },
    // We'll add Safeguarding, Finance, Members here later
  ];

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + "/");

  const initials = makeInitials(theme.clubName);

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR (desktop) */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-white">
        {/* Club header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={theme.logoUrl}
              alt={theme.clubName}
              className="h-9 w-9 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold">
              {initials}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900">
              {theme.clubName}
            </span>
            <span className="text-[11px] text-slate-500">
              Club admin · {theme.slug || "club"}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2 text-xs font-medium transition ${
                isActive(item.href)
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 text-[11px] text-slate-500">
          Powered by ClubStand
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex-1 flex flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2">
            {theme.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={theme.logoUrl}
                alt={theme.clubName}
                className="h-8 w-8 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-semibold">
                {initials}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">
                {theme.clubName}
              </span>
              <span className="text-[11px] text-slate-500">
                Club admin
              </span>
            </div>
          </div>
          {/* Simple link to dashboard on mobile; full mobile nav can come later */}
          <Link
            href={`${basePath}/dashboard`}
            className="text-[11px] text-slate-600 underline"
          >
            Dashboard
          </Link>
        </header>

        {/* Content */}
        <main className="px-4 py-6 md:px-8 md:py-8 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
