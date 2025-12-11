// app/admin/clubs/[clubId]/ClubAdminShell.tsx
"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Theme = {
  clubId: string;
  clubName: string;
  slug: string;
  logoUrl: string | null;
  primary: string;
  secondary: string;
};

type AdminPermissions = {
  is_super_admin: boolean;
  can_view_dashboard: boolean;
  can_view_juniors: boolean;
  can_edit_juniors: boolean;
  can_view_payments: boolean;
  can_edit_payments: boolean;
  can_manage_admins: boolean;
  can_manage_members: boolean;
  can_manage_safeguarding: boolean;
  can_manage_plans: boolean;
  can_manage_pricing: boolean;
};

type NavItem =
  | { type: "item"; href: string; label: string; key: string }
  | { type: "section"; label: string };

type Props = {
  children: ReactNode;
  theme: Theme;
};

export default function ClubAdminShell({ children, theme }: Props) {
  const pathname = usePathname();
  const basePath = `/admin/clubs/${theme.clubId}`;
  const year = new Date().getFullYear();

  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [admin, setAdmin] = useState<AdminPermissions | null | undefined>(undefined);
  const [permError, setPermError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAdmin() {
      setPermError(null);
      setAdmin(undefined);

      try {
        const res = await fetch(`/api/admin/clubs/${theme.clubId}/current-admin`, { cache: "no-store" });
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || `Failed to load admin permissions (${res.status})`);
        }

        const json = await res.json();
        if (cancelled) return;

        setAdmin(json.admin ?? null);

        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user?.email) setUserEmail(user.email);
        });
      } catch (err: any) {
        if (!cancelled) {
          setPermError(err?.message || "Failed to load admin permissions");
          setAdmin(null);
        }
      }
    }

    loadAdmin();
    return () => {
      cancelled = true;
    };
  }, [theme.clubId]);

  const initials = makeInitials(theme.clubName);

  const primary = "var(--brand-primary)";
  const secondary = "var(--brand-secondary)";

  const navItems: NavItem[] = [
    { type: "item", href: `${basePath}/dashboard`, label: "Dashboard", key: "dashboard" },
    { type: "item", href: `${basePath}/juniors`, label: "Juniors", key: "juniors" },
    { type: "item", href: `${basePath}/payments`, label: "Payments", key: "payments" },
    { type: "item", href: `${basePath}/plans`, label: "Plans & pricing", key: "plans" },
    { type: "section", label: "Settings" },
    { type: "item", href: `${basePath}/settings/admins`, label: "Admins & roles", key: "admins" }
  ];

  function canSeeNavItem(item: NavItem) {
    if (item.type === "section") return true;
    if (admin === undefined) return true;
    if (admin === null) return item.key === "dashboard";
    if (admin.is_super_admin) return true;

    switch (item.key) {
      case "dashboard": return admin.can_view_dashboard;
      case "juniors": return admin.can_view_juniors;
      case "payments": return admin.can_view_payments;
      case "plans": return admin.can_manage_plans;
      case "admins": return admin.can_manage_admins;
      default: return true;
    }
  }

  const filteredNavItems = navItems.filter(canSeeNavItem);
  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await supabase.auth.signOut();
      try {
        await fetch("/auth/logout", { method: "POST" });
      } catch {}
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* SIDEBAR */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-center gap-3">
            {theme.logoUrl ? (
              <img
                src={theme.logoUrl}
                alt={theme.clubName}
                className="h-10 w-10 rounded-full border object-cover"
                style={{ borderColor: secondary }}
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ background: primary }}
              >
                {initials}
              </div>
            )}
            <div>
              <span className="text-sm font-semibold" style={{ color: primary }}>
                {theme.clubName}
              </span>
              <span className="block text-[11px] text-slate-500 uppercase">{theme.slug}</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4 text-sm">
          {filteredNavItems.map((item, idx) =>
            item.type === "section" ? (
              <div
                key={`sec-${idx}`}
                className="mt-4 mb-1 px-3 text-[10px] uppercase tracking-wide text-slate-500"
              >
                {item.label}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center rounded-lg px-3 py-2 text-xs font-medium transition`}
                style={
                  isActive(item.href)
                    ? { background: primary, color: "white" }
                    : { color: "var(--brand-secondary)" }
                }
              >
                {item.label}
              </Link>
            )
          )}

          {userEmail && (
            <div className="px-3 py-2 text-[11px] text-slate-500 border-t border-slate-100">
              Signed in as
              <br />
              <span className="font-medium text-slate-700">{userEmail}</span>
            </div>
          )}

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-1 flex w-full items-center rounded-lg px-3 py-5 text-left text-xs hover:bg-slate-100 disabled:opacity-60"
            style={{ color: "var(--brand-secondary)" }}
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </nav>

        <div className="border-t border-slate-100 px-4 py-3 text-[11px] text-slate-500">
          Powered by ClubStand
        </div>
      </aside>

      {/* MAIN AREA */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            {theme.logoUrl ? (
              <img
                src={theme.logoUrl}
                alt={theme.clubName}
                className="h-8 w-8 rounded-full border object-cover"
                style={{ borderColor: secondary }}
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: primary }}
              >
                {initials}
              </div>
            )}

            <div>
              <span className="text-sm font-semibold" style={{color: primary}}>
                {theme.clubName}
              </span>
              <span className="block text-[11px] text-slate-500">Club admin</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-[11px] text-slate-600 underline disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </header>

        {permError && (
          <div className="px-4 pt-3">
            <p className="text-[11px] text-amber-700">
              (Permissions could not be fully loaded.)
            </p>
          </div>
        )}

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white/90">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
            <span className="text-[11px] text-slate-400">© {year} {theme.clubName}</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function makeInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
