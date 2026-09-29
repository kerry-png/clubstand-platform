// lib/pricing/simulator.ts
import {applyPricingRules,type PricingRule,type PricedItem,type PlanKind} from "./engine";
export type SimulationSelection={planId:string;quantity:number;kind:PlanKind;amountPennies:number};
export function simulateHouseholdPricing(selections:SimulationSelection[],rules:PricingRule[]){
 const items:PricedItem[]=[];
 for(const s of selections)for(let i=0;i<Math.max(0,Math.floor(s.quantity));i++)items.push({planId:s.planId,kind:s.kind,amountPennies:s.amountPennies});
 return applyPricingRules(items,rules);
}
