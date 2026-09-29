// lib/consent/policyVersion.ts
export type PolicySnapshot={label:string;description?:string|null;type:string;applies_to?:string|null;required?:boolean|null;link_url?:string|null};
export function policySnapshot(q:any):PolicySnapshot{return{label:String(q.label??""),description:q.description??null,type:String(q.type??q.question_type??""),applies_to:q.applies_to??"all",required:q.required!==false,link_url:q.link_url??null}}
export function samePolicySnapshot(a:PolicySnapshot,b:PolicySnapshot){return JSON.stringify(a)===JSON.stringify(b)}
