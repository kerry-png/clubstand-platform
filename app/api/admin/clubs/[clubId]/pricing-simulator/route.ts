// app/api/admin/clubs/[clubId]/pricing-simulator/route.ts
import {NextResponse} from "next/server";
import {supabaseServerClient} from "@/lib/supabaseServer";
import {getCurrentAdminForClub} from "@/lib/admins";
import {canManagePricing} from "@/lib/permissions";
import {simulateHouseholdPricing} from "@/lib/pricing/simulator";
export async function POST(req:Request,{params}:{params:Promise<{clubId:string}>}){
 const{clubId}=await params;const admin=await getCurrentAdminForClub(req,clubId);if(!admin||!canManagePricing(admin))return NextResponse.json({error:"Access denied"},{status:403});
 const body=await req.json().catch(()=>null);const selections=Array.isArray(body?.selections)?body.selections:[];
 const ids=[...new Set(selections.map((x:any)=>x.planId).filter(Boolean))] as string[];if(!ids.length)return NextResponse.json({error:"Add at least one membership to the example household."},{status:400});
 const [{data:plans,error:pe},{data:rules,error:re}]=await Promise.all([supabaseServerClient.from("membership_plans").select("id,name,is_player_plan,is_junior_only,price_pennies,annual_price_pennies").eq("club_id",clubId).in("id",ids),supabaseServerClient.from("pricing_rules").select("*").eq("club_id",clubId).eq("is_active",true).order("priority")]);
 if(pe||re)return NextResponse.json({error:"Could not load pricing configuration."},{status:500});const byId=new Map((plans??[]).map((p:any)=>[p.id,p]));
 const clean=selections.map((s:any)=>{const p:any=byId.get(s.planId);if(!p)throw new Error("Unknown membership plan.");return{planId:p.id,quantity:Math.max(0,Math.min(20,Number(s.quantity)||0)),kind:p.is_player_plan?(p.is_junior_only?"junior":"adult"):"other",amountPennies:Number(p.annual_price_pennies??p.price_pennies??0)}}); 
 try{return NextResponse.json({result:simulateHouseholdPricing(clean,rules as any),selections:clean})}catch(e:any){return NextResponse.json({error:e.message},{status:400})}
}