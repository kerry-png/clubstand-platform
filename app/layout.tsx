// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClubStand Membership Portal",
  description: "Multi-club membership, teams and payments on ClubStand.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="min-h-screen flex flex-col">
          <header className="border-b bg-white">
            <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm font-bold">
                  CS
                </span>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">
                    ClubStand Membership Portal
                  </div>
                  <div className="text-xs text-slate-500">
                    Multi-club grassroots management
                  </div>
                </div>
              </div>

              <nav className="flex items-center gap-4 text-sm">
                <a href="/" className="hover:text-slate-700">
                  Home
                </a>
                <a href="/dashboard" className="hover:text-slate-700">
                  Dashboard
                </a>
                <a href="/admin" className="hover:text-slate-700">
                  Admin
                </a>
                <a
                  href="/login"
                  className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-slate-100"
                >
                  Log in
                </a>
              </nav>
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
          </main>

          <footer className="border-t bg-white">
            <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-500 flex justify-between">
              <span>© {new Date().getFullYear()} ClubStand.</span>
              <span>Membership Portal · Multi-club, multi-sport</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
