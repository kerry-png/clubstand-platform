// app/admin/clubs/[clubId]/page.tsx

import { redirect } from "next/navigation";

type PageParams = { clubId: string };

type PageProps = {
  params: PageParams | Promise<PageParams>;
};

export default async function ClubAdminIndexPage({ params }: PageProps) {
  // Next 16: params might be a Promise
  const resolved =
    typeof (params as any)?.then === "function"
      ? await (params as Promise<PageParams>)
      : (params as PageParams);

  const { clubId } = resolved;

  // Always send people to the real dashboard route
  redirect(`/admin/clubs/${clubId}/dashboard`);
}
