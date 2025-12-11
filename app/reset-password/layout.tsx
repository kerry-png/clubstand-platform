// app/reset-password/layout.tsx
import type { ReactNode } from 'react';

export default function ResetPasswordLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50">
        {/* Simple, headerless layout just for reset-password routes */}
        {children}
      </body>
    </html>
  );
}
