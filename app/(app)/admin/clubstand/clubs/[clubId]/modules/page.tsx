// app/(app)/admin/clubstand/clubs/[clubId]/modules/page.tsx
import { requirePlatformAdmin } from '@/lib/auth/requirePlatformAdmin';
import ModulesClient from './ModulesClient';
type Props={params:Promise<{clubId:string}>};
export default async function ModulesPage({params}:Props){await requirePlatformAdmin({redirectTo:'/admin/clubstand/clubs'});const {clubId}=await params;return <ModulesClient clubId={clubId}/>}
