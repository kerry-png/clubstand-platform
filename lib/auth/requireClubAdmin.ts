// lib/auth/requireClubAdmin.ts
import { getCurrentAdminForClub } from '@/lib/admins';
import type { ClubAdminUser } from '@/lib/permissions';

export async function requireClubAdmin(
  req: Request | null,
  clubId: string,
  allowed: (admin: ClubAdminUser | null) => boolean,
) {
  const admin = await getCurrentAdminForClub(req, clubId);
  return admin && allowed(admin) ? admin : null;
}
