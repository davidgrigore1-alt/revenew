import "server-only";
import {requirePermission} from "@/lib/authz/require-permission";
import {getCurrentBusinessForUser} from "@/lib/business/current-business";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import type {AuthorizedSourceContext} from "./source-retrieval";
import type {CopilotEvidence,CopilotFinding} from "./copilot-types";
export async function compareSourceOpportunities(source:AuthorizedSourceContext):Promise<{findings:CopilotFinding[];evidence:CopilotEvidence[]}> {
 await requirePermission("opportunities.read");
 const current=await getCurrentBusinessForUser({redirectIfMissing:false}),client=await createSupabaseServerClient();
 if(!current||!client)return {findings:[],evidence:[]};
 const titles=Array.from(new Set(source.segments.map(s=>s.matchTitle).filter((s):s is string=>Boolean(s))));
 if(!titles.length)return {findings:[],evidence:[]};
 const {data,error}=await client.from("opportunities").select("id,title,status,recommended_action,updated_at,estimated_value_high,currency").eq("business_id",current.business.id).in("title",titles).limit(26);
 if(error)throw Error("Comparație indisponibilă.");
 // A truncated result cannot prove that a title has exactly one canonical match.
 if((data?.length??0)>25)return {findings:[],evidence:[]};
 const findings:CopilotFinding[]=[],evidence:CopilotEvidence[]=[];
 for(const segment of source.segments){const matches=(data??[]).filter(row=>row.title===segment.matchTitle);if(matches.length!==1)continue;const row=matches[0],sourceId=`opportunity:${row.id}`;
  const fact=`${row.title} · Stare în ReveNew: ${row.status} · Următoarea acțiune: ${String(row.recommended_action??"Necompletată").slice(0,500)}${row.estimated_value_high!=null&&row.currency?` · Valoare estimată: ${row.estimated_value_high} ${row.currency}; nu venit confirmat`:""}`;
  evidence.push({sourceId,label:row.title,sourceType:"Oportunitate",route:`/opportunities/${row.id}`,fact,recordId:row.id,observedAt:row.updated_at,claimType:"fact",providerId:"revenew"});
  findings.push({label:`${row.title} · comparație între surse`,detail:`Workbook: ${segment.excerpt}. ReveNew: ${fact}. Titlul coincide exact; aceasta este o asociere pentru revizuire, nu dovada că sursele descriu aceeași versiune a situației. Etapele sursei și stările ReveNew pot avea semnificații diferite.`,kind:"confirmed",sourceIds:[segment.sourceId,sourceId]});
 }
 return {findings:findings.slice(0,6),evidence:evidence.slice(0,6)};
}
