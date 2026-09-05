import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLocalDocument } from "@/lib/documents/local-documents";
import { getDocumentSourceDetail } from "@/lib/google-workspace/drive";
import type { CopilotEvidence } from "./copilot-types";
import { getOwnedExternalContext, requireGoogleConnectorActor } from "@/lib/google-workspace/repository";
import { GOOGLE_GMAIL_SCOPE, GOOGLE_CALENDAR_SCOPE } from "@/lib/google-workspace/oauth";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";

/** Fresh database reads, deliberately outside React's request memoization. */
export async function assertIntelligenceAuthority(profileId:string|null,businessId:string|undefined,expectedRole:string|null) {
  const client=await createSupabaseServerClient();
  if(!client||!profileId||!businessId)throw new Error("analysis_authority_missing");
  const {data:user,error}=await client.auth.getUser();
  if(error||!user.user)throw new Error("analysis_session_revoked");
  const profile=await client.from("profiles").select("id").eq("id",profileId).eq("user_id",user.user.id).maybeSingle();
  const business=await client.from("businesses").select("id,owner_profile_id").eq("id",businessId).maybeSingle();
  if(profile.error||business.error||!profile.data||!business.data)throw new Error("analysis_authority_changed");
  if(business.data.owner_profile_id===profileId&&expectedRole==="business_owner")return;
  const member=await client.from("business_members").select("role").eq("business_id",businessId).eq("profile_id",profileId).eq("status","active").maybeSingle();
  if(member.error||!member.data||`business_${member.data.role}`!==expectedRole)throw new Error("analysis_authority_changed");
}

export async function assertIntelligenceSourcesCurrent(evidence:CopilotEvidence[]) {
  const checked=new Set<string>();
  for(const item of evidence) {
    const privateEmail=item.sourceType==="Email",privateCalendar=item.sourceType==="Calendar"||item.sourceType==="Eveniment calendar";
    if((privateEmail||privateCalendar)&&item.recordId){
      const actor=await requireGoogleConnectorActor();
      const context=await getOwnedExternalContext({actor,...(privateEmail?{emailId:item.recordId}:{eventId:item.recordId})});
      const connection=context.connection;
      if(!connection||!connection.granted_scopes.includes(privateEmail?GOOGLE_GMAIL_SCOPE:GOOGLE_CALENDAR_SCOPE)||(privateEmail?connection.gmail_status:connection.calendar_status)!=="connected"||!(privateEmail?context.emails:context.events).some(record=>record.id===item.recordId))throw new Error("analysis_source_changed");
    }
    // Canonical records may be removed while synthesis runs. Recheck existence
    // through the current JWT/RLS, without trusting the old assistant turn.
    const table=item.sourceType==="Oportunitate"?"opportunities":item.sourceType==="Companie"?"crm_organizations":item.sourceType==="Contact"?"crm_contacts":null;
    if(table&&item.recordId&&/^[0-9a-f-]{36}$/i.test(item.recordId)){
      const client=await createSupabaseServerClient(),current=await getCurrentBusinessForUser({redirectIfMissing:false});
      if(!client||!current)throw new Error("analysis_authority_missing");
      const row=await client.from(table).select("id").eq("id",item.recordId).eq("business_id",current.business.id).maybeSingle();
      if(row.error||!row.data)throw new Error("analysis_source_changed");
    }
    const provenance=item.provenance;if(!provenance)continue;
    const key=`${provenance.family}:${provenance.recordId}:${provenance.version}`;
    if(checked.has(key))continue;checked.add(key);
    if(provenance.family==="local_documents") {
      const document=await getLocalDocument(provenance.recordId,provenance.version??undefined);
      if(!document||document.source.state!=="active"||document.version.state!=="ready"||`content:${document.version.content_hash}`!==provenance.independenceKey)throw new Error("analysis_source_changed");
    }
    if(provenance.family==="drive") {
      const sourceId=provenance.recordId.split(":")[0],source=await getDocumentSourceDetail(sourceId);
      if(!source||source.source.modified_time!==provenance.modifiedAt)throw new Error("analysis_source_changed");
    }
  }
}
