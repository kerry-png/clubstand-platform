// app/(app)/household/[householdId]/renew/household-forms/HouseholdFormsClient.tsx
"use client";import{useRouter}from"next/navigation";import SafeguardingStepClient from"@/components/safeguarding/SafeguardingStepClient";
export default function HouseholdFormsClient({clubId,householdId}:{clubId:string;householdId:string}){const r=useRouter();return <SafeguardingStepClient clubId={clubId} householdId={householdId} context="household" onComplete={()=>r.push(`/household/${householdId}/renew`)}/>}
