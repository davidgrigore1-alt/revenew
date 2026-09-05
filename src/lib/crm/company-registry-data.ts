import "server-only";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { buildCompanyRegistry, type RegistryOpportunity } from "@/lib/crm/company-registry";
import type { CrmOrganization, CrmContact, OpportunityAction } from "@/lib/types";

// Bounded cohort, not pagination. Exact counts detect both this cap and a lower API cap.
const REGISTRY_LIMIT = 500;
type Row = Record<string, unknown>;
type ReadResult = { data: Row[] | null; count: number | null; error: unknown };
function complete(result: ReadResult) { return !result.error && result.count !== null && result.data?.length === result.count; }
function records(result: ReadResult) { return result.error ? [] : result.data ?? []; }
function optional(row: Row, key: string) { return typeof row[key] === "string" ? row[key] as string : null; }

export async function getCompanyRegistryForCurrentBusiness() {
  const failure = { ready: false as const, error: "Companiile nu pot fi încărcate. Reîncearcă în câteva momente." };
  if (!isSupabaseConfigured) return failure;
  // Redirects/authorization resolve outside the data-error boundary.
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const supabase = await createSupabaseServerClient();
  if (!current || !supabase) return failure;
  const businessId = current.business.id;
  try {
    const [organizationResult, contactResult, opportunityResult] = await Promise.all([
      supabase.from("crm_organizations").select("id,business_id,name,website,industry,phone,city,county,country,notes,relationship_status,is_archived,archived_at,created_at,updated_at", { count: "exact" }).eq("business_id", businessId).eq("is_archived", false).order("updated_at", { ascending: false }).order("id").limit(REGISTRY_LIMIT),
      supabase.from("crm_contacts").select("id,business_id,organization_id,full_name,job_title,is_primary_for_organization,is_active,created_at,updated_at", { count: "exact" }).eq("business_id", businessId).eq("is_active", true).order("updated_at", { ascending: false }).order("id").limit(REGISTRY_LIMIT),
      supabase.from("opportunities").select("id,business_id,organization_id,status,lifecycle_status,owner_profile_id,created_at,updated_at", { count: "exact" }).eq("business_id", businessId).order("updated_at", { ascending: false }).order("id").limit(REGISTRY_LIMIT)
    ]);
    if (organizationResult.error) return failure;
    const opportunityIds = records(opportunityResult).map((row) => String(row.id));
    const empty: ReadResult = { data: [], count: 0, error: null };
    const [associationResult, actionResult, eventResult]: ReadResult[] = opportunityIds.length ? await Promise.all([
      supabase.from("opportunity_contacts").select("id,business_id,opportunity_id,crm_contacts(id,business_id,organization_id)", { count: "exact" }).eq("business_id", businessId).in("opportunity_id", opportunityIds).order("id").limit(REGISTRY_LIMIT),
      supabase.from("opportunity_actions").select("id,business_id,opportunity_id,title,status,due_at,created_at,updated_at", { count: "exact" }).eq("business_id", businessId).in("opportunity_id", opportunityIds).order("due_at", { ascending: true, nullsFirst: false }).order("id").limit(REGISTRY_LIMIT),
      supabase.from("opportunity_events").select("id,business_id,opportunity_id,label,occurred_at", { count: "exact" }).eq("business_id", businessId).in("opportunity_id", opportunityIds).order("occurred_at", { ascending: false }).order("id").limit(REGISTRY_LIMIT)
    ]) : [empty, empty, empty];

    const organizations: CrmOrganization[] = records(organizationResult).filter((row) => row.business_id === businessId).map((row) => ({
      id: String(row.id), businessId, name: String(row.name), website: optional(row, "website"), industry: optional(row, "industry"), phone: optional(row, "phone"), city: optional(row, "city"), county: optional(row, "county"), country: optional(row, "country"), notes: optional(row, "notes"), relationshipStatus: optional(row, "relationship_status"), isArchived: Boolean(row.is_archived), archivedAt: optional(row, "archived_at"), createdAt: optional(row, "created_at"), updatedAt: optional(row, "updated_at")
    }));
    const contacts: CrmContact[] = records(contactResult).filter((row) => row.business_id === businessId).map((row) => ({
      id: String(row.id), businessId, organizationId: optional(row, "organization_id"), fullName: String(row.full_name), jobTitle: optional(row, "job_title"), isPrimaryForOrganization: row.is_primary_for_organization === true, isActive: row.is_active === true, createdAt: optional(row, "created_at"), updatedAt: optional(row, "updated_at")
    }));
    const opportunities: RegistryOpportunity[] = records(opportunityResult).map((row) => ({ id: String(row.id), businessId: String(row.business_id), organizationId: optional(row, "organization_id"), status: row.status as RegistryOpportunity["status"], lifecycleStatus: (row.lifecycle_status ?? undefined) as RegistryOpportunity["lifecycleStatus"], ownerProfileId: optional(row, "owner_profile_id"), createdAt: optional(row, "created_at") ?? undefined, updatedAt: optional(row, "updated_at") ?? undefined }));
    const associations = records(associationResult).flatMap((row) => {
      const contact = row.crm_contacts as Row | null;
      return contact ? [{ businessId: String(row.business_id), opportunityId: String(row.opportunity_id), contactBusinessId: String(contact.business_id), organizationId: optional(contact, "organization_id") }] : [];
    });
    const actions = records(actionResult).map((row) => ({ id: String(row.id), businessId: String(row.business_id), opportunityId: String(row.opportunity_id), title: String(row.title), description: "", status: row.status as OpportunityAction["status"], dueDate: optional(row, "due_at") ?? "", createdAt: optional(row, "created_at") ?? undefined, updatedAt: optional(row, "updated_at") ?? undefined }));
    const events = records(eventResult).map((row) => ({ id: String(row.id), businessId: String(row.business_id), opportunityId: String(row.opportunity_id), label: String(row.label ?? ""), occurredAt: String(row.occurred_at ?? "") }));
    const coverage = { organizations: complete(organizationResult), contacts: complete(contactResult), opportunities: complete(opportunityResult), associations: complete(associationResult) && records(associationResult).length === associations.length, actions: complete(actionResult), events: complete(eventResult) };
    return { ready: true as const, organizations, contacts, registry: buildCompanyRegistry({ businessId, organizations, contacts, opportunities, associations, actions, events, coverage }) };
  } catch {
    return failure;
  }
}
