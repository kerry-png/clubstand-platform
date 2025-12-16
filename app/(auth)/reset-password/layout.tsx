// app/reset-password/layout.tsx
import type { ReactNode } from 'react';

export default function ResetPasswordLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Important: do NOT render <html> or <body> here.
  // Root layout already owns them (and injects CSS vars for branding).
  return <>{children}</>;
}
