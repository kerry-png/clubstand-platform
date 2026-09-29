// app/api/admin/clubs/[clubId]/membership-reviews/route.ts
import { NextResponse } from 'next/server';
import { supabaseServerClient } from '@/lib/supabaseServer';
import { getCurrentAdminForClub } from '@/lib/admins';
import { canManageMembers } from '@/lib/permissions';

async function clubIdFrom(context:any){const p=await context.params;return p?.clubId as string|undefined;}

export async function GET(req:Request, context:any){
  const clubId=await clubIdFrom(context); if(!clubId)return NextResponse.json({error:'Missing club.'},{status:400});
  const admin=await getCurrentAdminForClub(req,clubId); if(!admin||!canManageMembers(admin))return NextResponse.json({error:'Access denied.'},{status:403});
  const {data,error}=await supabaseServerClient.from('membership_subscriptions')
    .select('id,status,membership_year,amount_pennies,joining_treatment,trial_ends_at,requires_manual_review,review_status,reviewed_at,review_note,member:members!member_id(id,first_name,last_name,date_of_birth,member_type),plan:membership_plans!plan_id(id,name)')
    .eq('club_id',clubId).eq('requires_manual_review',true).order('membership_year',{ascending:false});
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({reviews:data??[]});
}

export async function PATCH(req:Request, context:any){
  const clubId=await clubIdFrom(context); if(!clubId)return NextResponse.json({error:'Missing club.'},{status:400});
  const admin=await getCurrentAdminForClub(req,clubId); if(!admin||!canManageMembers(admin))return NextResponse.json({error:'Access denied.'},{status:403});
  const body=await req.json().catch(()=>null) as {subscriptionId?:string;decision?:'approved'|'rejected';note?:string}|null;
  if(!body?.subscriptionId||!['approved','rejected'].includes(body.decision??''))return NextResponse.json({error:'Choose approve or reject.'},{status:400});
  const note=String(body.note??'').trim(); if(!note)return NextResponse.json({error:'Add a short reason for the decision.'},{status:400});
  const patch:any={review_status:body.decision,reviewed_at:new Date().toISOString(),reviewed_by_user_id:admin.user_id,review_note:note};
  if(body.decision==='approved'){patch.requires_manual_review=false;}
  else {patch.requires_manual_review=false;patch.status='cancelled';}
  const {data,error}=await supabaseServerClient.from('membership_subscriptions').update(patch).eq('id',body.subscriptionId).eq('club_id',clubId).eq('requires_manual_review',true).select('id').maybeSingle();
  if(error)return NextResponse.json({error:error.message},{status:500});
  if(!data)return NextResponse.json({error:'Review item was not found or has already been dealt with.'},{status:404});
  return NextResponse.json({success:true});
}
