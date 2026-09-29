// lib/pricing/engine.ts
// Generic household pricing engine. Club-specific rules belong in data, never code.
export type PricingRuleType="household_cap"|"multi_member_discount"|"bundle"|"nth_member_discount";
export type PlanKind="adult"|"junior"|"other";
export type PricedItem={subscriptionId?:string;memberId?:string;planId:string;kind:PlanKind;amountPennies:number};
export type PricingRule={
 id:string;name?:string|null;rule_type:PricingRuleType;applies_to_plan_ids:string[]|null;min_quantity:number|null;
 cap_amount_pennies:number|null;discount_amount_pennies:number|null;discount_percent:number|null;
 bundle_price_pennies:number|null;bundle_adults_required:number|null;bundle_juniors_required:number|null;bundle_juniors_any:boolean|null;
 priority:number;is_active:boolean;
 // v16 optional extensions
 discount_from_position?:number|null;maximum_discounted_members?:number|null;
 required_plan_ids?:string[]|null;required_plan_quantities?:Record<string,number>|null;
};
export type PricingResult={baseTotalPennies:number;finalTotalPennies:number;adjustmentPennies:number;applied:Array<{ruleId:string;ruleName?:string|null;ruleType:PricingRuleType;amountPennies:number}>};

function eligible(items:PricedItem[],r:PricingRule){return items.filter(i=>!r.applies_to_plan_ids?.length||r.applies_to_plan_ids.includes(i.planId))}
function discountFor(items:PricedItem[],r:PricingRule,count:number){
 const targets=[...items].sort((a,b)=>a.amountPennies-b.amountPennies).slice(0,Math.max(0,count));
 if((r.discount_amount_pennies??0)>0)return Math.min(targets.reduce((s,i)=>s+i.amountPennies,0),(r.discount_amount_pennies??0)*targets.length);
 if((r.discount_percent??0)>0)return targets.reduce((s,i)=>s+Math.round(i.amountPennies*(r.discount_percent!/100)),0);
 return 0;
}
function bundleMatches(items:PricedItem[],r:PricingRule){
 const adults=items.filter(i=>i.kind==="adult").length,juniors=items.filter(i=>i.kind==="junior").length;
 if((r.bundle_adults_required??0)>adults)return false;
 if(r.bundle_juniors_any ? juniors<1 : (r.bundle_juniors_required??0)>juniors)return false;
 const req=r.required_plan_quantities??{};
 for(const [planId,qty] of Object.entries(req))if(items.filter(i=>i.planId===planId).length<qty)return false;
 if(r.required_plan_ids?.length&&r.required_plan_ids.some(id=>!items.some(i=>i.planId===id)))return false;
 return true;
}
export function applyPricingRules(items:PricedItem[],rules:PricingRule[]):PricingResult{
 const base=items.reduce((s,i)=>s+Math.max(0,i.amountPennies),0);let total=base;const applied:PricingResult["applied"]=[];
 const active=[...rules].filter(r=>r.is_active).sort((a,b)=>a.priority-b.priority);
 // A matching bundle is an explicit household price. First priority match wins.
 for(const r of active.filter(r=>r.rule_type==="bundle")){
  if(bundleMatches(items,r)&&(r.bundle_price_pennies??0)>=0){const next=Math.max(0,r.bundle_price_pennies!);applied.push({ruleId:r.id,ruleName:r.name,ruleType:r.rule_type,amountPennies:next-total});return{baseTotalPennies:base,finalTotalPennies:next,adjustmentPennies:next-base,applied}}
 }
 // Discounts can express "2nd/3rd child onwards", fixed or percentage, scoped to selected plans.
 for(const r of active.filter(r=>r.rule_type==="multi_member_discount"||r.rule_type==="nth_member_discount")){
  const e=eligible(items,r);const from=Math.max(2,r.discount_from_position??r.min_quantity??2);
  let count=Math.max(0,e.length-(from-1));if(r.maximum_discounted_members!=null)count=Math.min(count,Math.max(0,r.maximum_discounted_members));
  const d=discountFor(e,r,count);if(d>0){total=Math.max(0,total-d);applied.push({ruleId:r.id,ruleName:r.name,ruleType:r.rule_type,amountPennies:-d})}
 }
 // Multiple caps are allowed; priority/order makes the lowest applicable effective cap win naturally.
 for(const r of active.filter(r=>r.rule_type==="household_cap")){
  if((r.cap_amount_pennies??0)>=0&&total>r.cap_amount_pennies!){const delta=r.cap_amount_pennies!-total;total=r.cap_amount_pennies!;applied.push({ruleId:r.id,ruleName:r.name,ruleType:r.rule_type,amountPennies:delta})}
 }
 return{baseTotalPennies:base,finalTotalPennies:Math.max(0,total),adjustmentPennies:Math.max(0,total)-base,applied};
}