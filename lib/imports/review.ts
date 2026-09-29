// lib/imports/review.ts
import type {ImportPreviewRow} from "./membershipCsv";
export type ImportDecision="import_new"|"link_existing"|"skip";
export type ReviewRow=ImportPreviewRow&{decision:ImportDecision;resolvedHouseholdKey:string;editedFirstName:string;editedLastName:string;editedDob:string;editedEmail:string;editedResponsibleAdultEmail:string};
export function createReviewRows(rows:ImportPreviewRow[]):ReviewRow[]{return rows.map(r=>({...r,decision:r.status==="duplicate"?"link_existing":r.status==="invalid"?"skip":"import_new",resolvedHouseholdKey:r.proposedHouseholdKey,editedFirstName:r.firstName,editedLastName:r.lastName,editedDob:r.dob,editedEmail:r.email,editedResponsibleAdultEmail:r.responsibleAdultEmail}))}
export function reviewIssue(row:ReviewRow):string|null{
 if(row.decision==="skip")return null;
 if(row.decision==="link_existing"&&!row.duplicateMemberId)return"Choose an existing member to link.";
 if(!row.editedFirstName.trim()||!row.editedLastName.trim())return"First and last name are required.";
 if(row.decision==="import_new"&&!row.resolvedHouseholdKey.trim())return"Choose or create an account/household grouping.";
 return null;
}
