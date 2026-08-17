"use server";

import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import {
  executeCommercialSearch,
  parseCommercialSearchIntent,
  suggestedCommercialQueries,
  type CommercialSearchRecord,
  type CommercialSearchResponse
} from "@/lib/commercial-search";
import { recordProductEvent } from "@/lib/product-events";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function safeQuery(value: string) {
  return value.normalize("NFKC").replace(/[,()%*_]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

function unavailable(rawQuery: string, error: string): CommercialSearchResponse {
  const intent = parseCommercialSearchIntent(rawQuery);
  return { ok: false, intent, summary: error, results: [], total: 0, insufficientData: true, suggestions: [...suggestedCommercialQueries], error };
}

export async function searchWorkspace(rawQuery: string): Promise<CommercialSearchResponse> {
  await requirePermission("workspace.read");
  const intent = parseCommercialSearchIntent(rawQuery);
  const query = safeQuery(intent.entityQuery ?? intent.rawQuery);
  if (intent.normalizedQuery.length < 2) return executeCommercialSearch(intent, { records: [] });

  const [current, supabase] = await Promise.all([
    getCurrentBusinessForUser({ redirectIfMissing: true }),
    Promise.resolve(createSupabaseServerClient())
  ]);
  if (!current || !supabase) return unavailable(rawQuery, "Căutarea nu este disponibilă momentan.");

  const businessId = current.business.id;
  if (intent.kind !== "entity_search" && intent.kind !== "company_context") {
    try {
      const opportunities = await getOpportunitiesForCurrentBusiness();
      const response = executeCommercialSearch(intent, { opportunities });
      void recordProductEvent("global_search_used", { businessId, metadata: { intent: intent.kind, result_group: response.results[0]?.group ?? "none" } });
      return response;
    } catch (error) {
      console.warn("commercial_search_failed", { intent: intent.kind, reason: error instanceof Error ? error.name : "unknown" });
      return unavailable(rawQuery, "Căutarea nu a putut fi finalizată. Reîncearcă.");
    }
  }

  if (query.length < 2) return executeCommercialSearch(intent, { records: [] });
  const pattern = `%${query}%`;
  const exactId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(query) ? query : null;

  const [organizations, contacts, opportunities, actions, documents] = await Promise.all([
    supabase.from("crm_organizations").select("id,name,website,industry,city,updated_at").eq("business_id", businessId).eq("is_archived", false).or(`name.ilike.${pattern},normalized_name.ilike.${pattern},website.ilike.${pattern}`).order("updated_at", { ascending: false }).limit(5),
    supabase.from("crm_contacts").select("id,full_name,email,phone,organization_id,job_title,updated_at").eq("business_id", businessId).eq("is_active", true).or(`full_name.ilike.${pattern},normalized_name.ilike.${pattern},normalized_email.ilike.${pattern},phone.ilike.${pattern}`).order("updated_at", { ascending: false }).limit(5),
    supabase.from("opportunities").select("id,title,status,summary,organization_id,estimated_value_high,currency,updated_at").eq("business_id", businessId).or(exactId ? `id.eq.${exactId},title.ilike.${pattern}` : `title.ilike.${pattern},summary.ilike.${pattern}`).order("updated_at", { ascending: false }).limit(5),
    supabase.from("opportunity_actions").select("id,opportunity_id,title,status,due_at,updated_at").eq("business_id", businessId).ilike("title", pattern).order("updated_at", { ascending: false }).limit(5),
    supabase.from("opportunity_documents").select("id,opportunity_id,title,status,created_at").eq("business_id", businessId).ilike("title", pattern).order("updated_at", { ascending: false }).limit(5)
  ]);

  const firstError = [organizations.error, contacts.error, opportunities.error, actions.error, documents.error].find(Boolean);
  if (firstError) {
    console.warn("workspace_search_failed", { code: firstError.code });
    return unavailable(rawQuery, "Căutarea nu a putut fi finalizată. Reîncearcă.");
  }

  const matchedCompanyIds = (organizations.data ?? []).map((row) => row.id);
  const [relatedContacts, relatedOpportunities] = intent.kind === "company_context" && matchedCompanyIds.length > 0
    ? await Promise.all([
        supabase.from("crm_contacts").select("id,full_name,email,phone,organization_id,job_title,updated_at").eq("business_id", businessId).eq("is_active", true).in("organization_id", matchedCompanyIds).order("updated_at", { ascending: false }).limit(10),
        supabase.from("opportunities").select("id,title,status,summary,organization_id,estimated_value_high,currency,updated_at").eq("business_id", businessId).in("organization_id", matchedCompanyIds).order("updated_at", { ascending: false }).limit(10)
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  const relatedError = relatedContacts.error ?? relatedOpportunities.error;
  if (relatedError) {
    console.warn("workspace_company_context_failed", { code: relatedError.code });
    return unavailable(rawQuery, "Contextul companiei nu a putut fi verificat complet. Reîncearcă.");
  }

  const contactRows = [...(contacts.data ?? []), ...(relatedContacts.data ?? [])].filter((row, index, rows) => rows.findIndex((item) => item.id === row.id) === index);
  const opportunityRows = [...(opportunities.data ?? []), ...(relatedOpportunities.data ?? [])].filter((row, index, rows) => rows.findIndex((item) => item.id === row.id) === index);

  const records: CommercialSearchRecord[] = [
    ...(organizations.data ?? []).map((row) => ({ id: row.id, entityType: "company" as const, title: row.name, context: [row.industry, row.city, row.website].filter(Boolean).join(" · ") || "Companie", href: `/crm/organizations/${row.id}`, searchableText: [row.industry, row.city, row.website].filter(Boolean).join(" "), relatedCompanyId: row.id, updatedAt: row.updated_at })),
    ...contactRows.map((row) => ({ id: row.id, entityType: "contact" as const, title: row.full_name, context: [row.job_title, row.email, row.phone].filter(Boolean).join(" · ") || "Contact", href: `/contacts?contact=${row.id}`, searchableText: [row.job_title, row.email, row.phone].filter(Boolean).join(" "), relatedCompanyId: row.organization_id, updatedAt: row.updated_at })),
    ...opportunityRows.map((row) => ({ id: row.id, entityType: "opportunity" as const, title: row.title, context: `Status: ${row.status}${row.estimated_value_high ? ` · valoare estimată ${row.estimated_value_high} ${row.currency ?? "RON"}, nu venit confirmat` : ""}`, href: `/opportunities/${row.id}`, searchableText: [row.summary, row.status].filter(Boolean).join(" "), status: row.status, amount: row.estimated_value_high, currency: row.currency, relatedCompanyId: row.organization_id, updatedAt: row.updated_at })),
    ...(actions.data ?? []).map((row) => ({ id: row.id, entityType: "action" as const, title: row.title, context: `Status: ${row.status}${row.due_at ? ` · termen ${row.due_at}` : ""}`, href: `/opportunities/${row.opportunity_id}`, searchableText: row.status, status: row.status, updatedAt: row.updated_at })),
    ...(documents.data ?? []).map((row) => ({ id: row.id, entityType: "document" as const, title: row.title, context: `Status: ${row.status}`, href: `/opportunities/${row.opportunity_id}`, searchableText: row.status, status: row.status, updatedAt: row.created_at }))
  ];

  const response = executeCommercialSearch(intent, { records });
  void recordProductEvent("global_search_used", { businessId, metadata: { intent: intent.kind, result_group: response.results[0]?.group ?? "none" } });
  return response;
}
