"use server";

import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { recordProductEvent } from "@/lib/product-events";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type WorkspaceSearchResult = {
  id: string;
  group: "Companii" | "Contacte" | "Oportunități" | "Activități" | "Documente";
  title: string;
  context: string;
  href: string;
};

function safeQuery(value: string) {
  return value.normalize("NFKC").replace(/[,()%]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function searchWorkspace(rawQuery: string): Promise<{ ok: boolean; results: WorkspaceSearchResult[]; error?: string }> {
  await requirePermission("workspace.read");
  const query = safeQuery(rawQuery);
  if (query.length < 2) return { ok: true, results: [] };

  const [current, supabase] = await Promise.all([
    getCurrentBusinessForUser({ redirectIfMissing: true }),
    Promise.resolve(createSupabaseServerClient())
  ]);
  if (!current || !supabase) return { ok: false, results: [], error: "Căutarea nu este disponibilă momentan." };

  const businessId = current.business.id;
  const pattern = `%${query}%`;
  const exactId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(query) ? query : null;

  const [organizations, contacts, opportunities, actions, documents] = await Promise.all([
    supabase.from("crm_organizations").select("id,name,website,industry").eq("business_id", businessId).eq("is_archived", false).or(`name.ilike.${pattern},normalized_name.ilike.${pattern},website.ilike.${pattern}`).order("updated_at", { ascending: false }).limit(5),
    supabase.from("crm_contacts").select("id,full_name,email,phone,organization_id").eq("business_id", businessId).eq("is_active", true).or(`full_name.ilike.${pattern},normalized_name.ilike.${pattern},normalized_email.ilike.${pattern},phone.ilike.${pattern}`).order("updated_at", { ascending: false }).limit(5),
    supabase.from("opportunities").select("id,title,status,summary").eq("business_id", businessId).or(exactId ? `id.eq.${exactId},title.ilike.${pattern}` : `title.ilike.${pattern},summary.ilike.${pattern}`).order("updated_at", { ascending: false }).limit(5),
    supabase.from("opportunity_actions").select("id,opportunity_id,title,status").eq("business_id", businessId).ilike("title", pattern).order("updated_at", { ascending: false }).limit(5),
    supabase.from("opportunity_documents").select("id,opportunity_id,title,status").eq("business_id", businessId).ilike("title", pattern).order("updated_at", { ascending: false }).limit(5)
  ]);

  const firstError = [organizations.error, contacts.error, opportunities.error, actions.error, documents.error].find(Boolean);
  if (firstError) {
    console.warn("workspace_search_failed", { code: firstError.code });
    return { ok: false, results: [], error: "Căutarea nu a putut fi finalizată. Reîncearcă." };
  }

  const results: WorkspaceSearchResult[] = [
    ...(organizations.data ?? []).map((row) => ({ id: row.id, group: "Companii" as const, title: row.name, context: [row.industry, row.website].filter(Boolean).join(" · ") || "Companie", href: `/crm/organizations/${row.id}` })),
    ...(contacts.data ?? []).map((row) => ({ id: row.id, group: "Contacte" as const, title: row.full_name, context: [row.email, row.phone].filter(Boolean).join(" · ") || "Contact", href: `/contacts?contact=${row.id}` })),
    ...(opportunities.data ?? []).map((row) => ({ id: row.id, group: "Oportunități" as const, title: row.title, context: `Status: ${row.status}`, href: `/opportunities/${row.id}` })),
    ...(actions.data ?? []).map((row) => ({ id: row.id, group: "Activități" as const, title: row.title, context: `Status: ${row.status}`, href: `/opportunities/${row.opportunity_id}` })),
    ...(documents.data ?? []).map((row) => ({ id: row.id, group: "Documente" as const, title: row.title, context: `Status: ${row.status}`, href: `/opportunities/${row.opportunity_id}` }))
  ];

  void recordProductEvent("global_search_used", { businessId, metadata: { result_group: results[0]?.group ?? "none" } });
  return { ok: true, results };
}
