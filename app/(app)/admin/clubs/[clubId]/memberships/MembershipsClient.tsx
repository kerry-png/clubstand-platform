// app/(app)/admin/clubs/[clubId]/memberships/MembershipsClient.tsx
"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Member={id:string;first_name:string;last_name:string;member_type:string;status:string;age_band:string|null;is_junior:boolean;is_playing:boolean;has_active_membership:boolean;latest_membership_start:string|null};
type Stats={seasonYear:number;members:Member[]};
type Review={id:string;status:string;membership_year:number;amount_pennies:number|null;joining_treatment:string|null;trial_ends_at:string|null;requires_manual_review:boolean;review_status:string;reviewed_at:string|null;review_note:string|null;member:{id:string;first_name:string;last_name:string;date_of_birth:string|null;member_type:string}|null;plan:{id:string;name:string}|null};
export default function MembershipsClient({clubId}:{clubId:string}){
 const [stats,setStats]=useState<Stats|null>(null),[reviews,setReviews]=useState<Review[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null),[view,setView]=useState<"review"|"missing"|"current">("review");
 const load=useCallback(async()=>{setLoading(true);setError(null);try{const [a,b]=await Promise.all([fetch(`/api/admin/clubs/${clubId}/stats`,{cache:"no-store"}),fetch(`/api/admin/clubs/${clubId}/membership-reviews`,{cache:"no-store"})]);const aj=await a.json(),bj=await b.json();if(!a.ok)throw new Error(aj?.error||"Failed to load memberships");if(!b.ok)throw new Error(bj?.error||"Failed to load review queue");setStats(aj);setReviews(bj.reviews??[])}catch(e:any){setError(e?.message||"Failed to load memberships")}finally{setLoading(false)}},[clubId]);
 useEffect(()=>{load()},[load]);
 const active=useMemo(()=>stats?.members.filter(m=>m.status!=="inactive")??[],[stats]);
 const missing=active.filter(m=>!m.has_active_membership), current=active.filter(m=>m.has_active_membership), pending=reviews.filter(r=>r.review_status==="pending"&&r.requires_manual_review);
 async function decide(r:Review,decision:"approved"|"rejected"){const note=window.prompt(`${decision==="approved"?"Approve":"Reject"} ${r.member?.first_name??"this membership"} — add a short reason:`);if(!note?.trim())return;const res=await fetch(`/api/admin/clubs/${clubId}/membership-reviews`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({subscriptionId:r.id,decision,note})});const j=await res.json().catch(()=>null);if(!res.ok){alert(j?.error||"Could not save decision");return}await load()}
 const list=view==="missing"?missing:current;
 return <div className="space-y-6">
  <header><h1 className="text-2xl font-semibold text-slate-900">Memberships</h1><p className="text-sm text-slate-600">Review exceptions and approvals, then manage membership entitlement. Payments are kept separately.</p><div className="mt-3"><Link href={`/admin/clubs/${clubId}/payments`} className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium">Go to payments</Link></div></header>
  <div className="flex flex-wrap gap-2 text-xs">
   <button onClick={()=>setView("review")} className={`rounded-full border px-3 py-1 ${view==="review"?"bg-slate-900 text-white":"bg-white"}`}>Needs review ({pending.length})</button>
   <button onClick={()=>setView("missing")} className={`rounded-full border px-3 py-1 ${view==="missing"?"bg-slate-900 text-white":"bg-white"}`}>No membership ({missing.length})</button>
   <button onClick={()=>setView("current")} className={`rounded-full border px-3 py-1 ${view==="current"?"bg-slate-900 text-white":"bg-white"}`}>Membership recorded ({current.length})</button>
  </div>
  {loading&&<p className="text-sm text-slate-600">Loading…</p>}{error&&<p className="text-sm text-red-600">{error}</p>}
  {!loading&&!error&&view==="review"&&<section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">Memberships needing a decision</h2><p className="mt-1 text-xs text-slate-600">These were held because the plan requires approval or the joining rules require manual review. Decisions are recorded with the administrator and reason.</p>
   {pending.length===0?<p className="mt-4 text-sm text-slate-600">Nothing is waiting for review.</p>:<div className="mt-4 space-y-3">{pending.map(r=><div key={r.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap justify-between gap-3"><div><div className="font-medium">{r.member?.first_name} {r.member?.last_name}</div><div className="text-xs text-slate-600">{r.plan?.name??"Membership"} · {r.membership_year} · {r.joining_treatment??"standard"}</div></div><div className="flex gap-2"><button onClick={()=>decide(r,"approved")} className="rounded-lg border px-3 py-1.5 text-xs font-medium">Approve</button><button onClick={()=>decide(r,"rejected")} className="rounded-lg border px-3 py-1.5 text-xs font-medium text-red-700">Reject</button></div></div></div>)}</div>}
  </section>}
  {!loading&&!error&&view!=="review"&&<section className="rounded-xl border bg-white p-4"><div className="flex justify-between"><div><h2 className="font-semibold">{view==="missing"?"People without a membership":"People with a membership"}</h2><p className="text-xs text-slate-600">Membership year {stats?.seasonYear??"—"}. Includes playing and non-playing members.</p></div><b className="text-sm">{list.length}</b></div>
   {list.length===0?<p className="mt-4 text-sm text-slate-600">No people in this view.</p>:<div className="mt-3 overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="border-b bg-slate-50 text-left"><th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Age band</th><th className="p-2">Latest membership</th></tr></thead><tbody>{list.map(m=><tr key={m.id} className="border-b"><td className="p-2">{m.first_name} {m.last_name}</td><td className="p-2">{m.member_type}</td><td className="p-2">{m.age_band??"—"}</td><td className="p-2">{m.latest_membership_start?new Date(m.latest_membership_start).toLocaleDateString("en-GB"):"—"}</td></tr>)}</tbody></table></div>}
  </section>}
 </div>
}