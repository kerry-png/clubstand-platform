// proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TEMP: do not enforce auth at the edge.
// Just let everything through so you can use /admin again.
export function proxy(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
