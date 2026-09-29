// app/api/admin/clubs/[clubId]/pricing-rules/route.ts
import {NextResponse} from "next/server";
import {supabaseServerClient} from "@/lib/supabaseServer";
import {getCurrentAdminForClub} from "@/lib/admins";
import {canManagePricing} from "@/lib/permissions";
type Props={params:Promise<{clubId:string}>};
async function admin(clubId:string){const a=await getCurrentAdminForClub(null,clubId);return a&&canManagePricing(a)?a:null}
export async function GET(_req:Request,{params}:Props){const{clubId}=await params;if(!await admin(clubId))return NextResponse.json({error:"Access denied"},{status:403});const{data,error}=await supabaseServerClient.from("pricing_rules").select("*").eq("club_id",clubId).order("priority");return error?NextResponse.json({error:"Failed to load pricing rules"},{status:500}):NextResponse.json({rules:data??[]})}
export async function POST(req:Request,{params}:Props){
 const{clubId}=await params;if(!await admin(clubId))return NextResponse.json({error:"Access denied"},{status:403});
 const body=await req.json().catch(()=>null);const rules=body?.rules;if(!Array.isArray(rules))return NextResponse.json({error:"Rules must be a list."},{status:400});
 const allowed=new Set(["household_cap","multi_member_discount","bundle","nth_member_discount"]);
 const planIds=new Set<string>();for(const r of rules){for(const id of [...(r.applies_to_plan_ids??[]),...(r.required_plan_ids??[])])planIds.add(String(id))}
 if(planIds.size){const{data:owned,error:poe}=await supabaseServerClient.from("membership_plans").select("id").eq("club_id",clubId).in("id",[...planIds]);if(poe)return NextResponse.json({error:"Could not validate membership plans."},{status:500});const ownedIds=new Set((owned??[]).map((p:any)=>p.id));for(const id of planIds)if(!ownedIds.has(id))return NextResponse.json({error:"A pricing rule refers to a membership plan that does not belong to this club."},{status:400})}
 for(const r of rules){
  if(!allowed.has(r.rule_type))return NextResponse.json({error:"Unknown pricing rule type."},{status:400});
  if(r.discount_percent!=null&&(Number(r.discount_percent)<0||Number(r.discount_percent)>100))return NextResponse.json({error:"Discount percentage must be 0–100."},{status:400});
  if(r.discount_amount_pennies!=null&&Number(r.discount_amount_pennies)<0)return NextResponse.json({error:"Discount amount cannot be negative."},{status:400});
  if(r.discount_percent!=null&&r.discount_amount_pennies!=null)return NextResponse.json({error:"Use either a fixed discount or a percentage, not both."},{status:400});
  if(["nth_member_discount","multi_member_discount"].includes(r.rule_type)&&Number(r.discount_from_position??r.min_quantity??0)<2)return NextResponse.json({error:"Member discount must start from member 2 or later."},{status:400});
  if(r.maximum_discounted_members!=null&&Number(r.maximum_discounted_members)<1)return NextResponse.json({error:"Maximum discounted members must be at least 1."},{status:400});
  if(r.rule_type==="household_cap"&&r.is_active&&Number(r.cap_amount_pennies??0)<=0)return NextResponse.json({error:"An active household cap needs an amount above £0."},{status:400});
  if(r.rule_type==="bundle"&&r.is_active&&Number(r.bundle_price_pennies??-1)<0)return NextResponse.json({error:"An active family bundle needs a valid family price."},{status:400});
 }
 const rows=rules.map((r:any,i:number)=>({id:r.id||undefined,club_id:clubId,name:String(r.name??"").trim()||null,rule_type:r.rule_type,applies_to_plan_ids:r.applies_to_plan_ids??null,min_quantity:r.min_quantity??null,cap_amount_pennies:r.cap_amount_pennies??null,discount_amount_pennies:r.discount_amount_pennies??null,discount_percent:r.discount_percent??null,bundle_price_pennies:r.bundle_price_pennies??null,bundle_adults_required:r.bundle_adults_required??null,bundle_juniors_required:r.bundle_juniors_required??null,bundle_juniors_any:r.bundle_juniors_any??null,discount_from_position:r.discount_from_position??null,maximum_discounted_members:r.maximum_discounted_members??null,required_plan_ids:r.required_plan_ids??null,required_plan_quantities:r.required_plan_quantities??null,is_exclusive:r.rule_type==="bundle",priority:r.priority??((i+1)*10),is_active:!!r.is_active}));
 if(rows.length){const{error}=await supabaseServerClient.from("pricing_rules").upsert(rows,{onConflict:"id"});if(error)return NextResponse.json({error:"Failed to save pricing rules",details:error.message},{status:500})}
 const keep=rules.map((r:any)=>r.id).filter(Boolean);let del=supabaseServerClient.from("pricing_rules").delete().eq("club_id",clubId);if(keep.length)del=del.not("id","in",`(${keep.join(",")})`);const{error:de}=await del;if(de)return NextResponse.json({error:"Rules saved but obsolete rules could not be removed.",details:de.message},{status:500});
 const{data,error}=await supabaseServerClient.from("pricing_rules").select("*").eq("club_id",clubId).order("priority");return error?NextResponse.json({error:error.message},{status:500}):NextResponse.json({rules:data??[]});
}