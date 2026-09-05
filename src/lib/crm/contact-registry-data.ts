import "server-only";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import { buildContactRegistry, type ContactOpportunity } from "@/lib/crm/contact-registry";
import type { CrmContact, CrmOrganization } from "@/lib/types";

const CONTACT_LIMIT = 500;
type Row = Record<string, unknown>;
type ReadResult = { data: Row[] | null; count: number | null; error: unknown };
function records(result: ReadResult) { return result.error ? [] : result.data ?? []; }
function complete(result: ReadResult) { return !result.error && result.count !== null && result.data?.length === result.count; }
function optional(row: Row, key: string) { return typeof row[key] === "string" ? row[key] as string : null; }

export async function getContactRegistryForCurrentBusiness() {
  const failure = { ready: false as const, error: "Contactele nu pot fi încărcate. Reîncearcă în câteva momente." };
  if (!isSupabaseConfigured) return failure;
  // Authorization and redirects must propagate; only data failures are sanitized.
  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const supabase = await createSupabaseServerClient();
  if (!current || !supabase) return failure;
  const businessId = current.business.id;
  try {
    const [contactResult, organizationResult] = await Promise.all([
      supabase.from("crm_contacts").select("id,business_id,organization_id,first_name,last_name,full_name,job_title,department,decision_role,email,phone,professional_url,is_active,is_primary_for_organization,notes,archived_at,created_at,updated_at", { count: "exact" }).eq("business_id", businessId).order("updated_at", { ascending: false }).order("id").limit(CONTACT_LIMIT),
      supabase.from("crm_organizations").select("id,business_id,name,is_archived", { count: "exact" }).eq("business_id", businessId).eq("is_archived", false).order("name").order("id").limit(CONTACT_LIMIT)
    ]);
    if (contactResult.error) return failure;
    const contacts: CrmContact[] = records(contactResult).filter((row) => row.business_id === businessId).map((row) => ({
      id: String(row.id), businessId, organizationId: optional(row, "organization_id"), fullName: String(row.full_name),
      firstName: optional(row, "first_name"), lastName: optional(row, "last_name"), jobTitle: optional(row, "job_title"), department: optional(row, "department"), decisionRole: optional(row, "decision_role"), email: optional(row, "email"), phone: optional(row, "phone"), professionalUrl: optional(row, "professional_url"), notes: optional(row, "notes"),
      isActive: typeof row.is_active === "boolean" ? row.is_active : null, isPrimaryForOrganization: typeof row.is_primary_for_organization === "boolean" ? row.is_primary_for_organization : null,
      archivedAt: optional(row, "archived_at"), createdAt: optional(row, "created_at"), updatedAt: optional(row, "updated_at")
    }));
    const organizations: CrmOrganization[] = records(organizationResult).filter((row) => row.business_id === businessId).map((row) => ({ id: String(row.id), businessId, name: String(row.name), isArchived: row.is_archived === true }));
    // One association read for the cohort, with a narrow opportunity join; no
    // per-person queries, action timelines, financial payloads or full opp loader.
    const associationResult: ReadResult = contacts.length ? await supabase.from("opportunity_contacts")
      .select("id,business_id,contact_id,opportunities(id,business_id,title,status,lifecycle_status,updated_at)", { count: "exact" })
      .eq("business_id", businessId).in("contact_id", contacts.map((contact) => contact.id)).order("id").limit(CONTACT_LIMIT) : { data: [], count: 0, error: null };
    const associations = records(associationResult).flatMap((row) => {
      const opportunity = row.opportunities as Row | null;
      if (!opportunity || Array.isArray(opportunity) || opportunity.business_id !== businessId || row.business_id !== businessId) return [];
      return [{ businessId, contactId: String(row.contact_id), opportunity: { id: String(opportunity.id), businessId, title: String(opportunity.title), status: opportunity.status as ContactOpportunity["status"], lifecycleStatus: (opportunity.lifecycle_status ?? undefined) as ContactOpportunity["lifecycleStatus"], updatedAt: optional(opportunity, "updated_at") ?? undefined } }];
    });
    const coverage = { contacts: complete(contactResult) && records(contactResult).length === contacts.length, organizations: complete(organizationResult) && records(organizationResult).length === organizations.length, associations: complete(associationResult) && records(associationResult).length === associations.length };
    const registry = buildContactRegistry({ businessId, contacts, organizations, associations, coverage });
    return { ready: true as const, organizations, contacts: registry.rows.map((row) => row.contact), registry };
  } catch { return failure; }
}
