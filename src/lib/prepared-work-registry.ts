import "server-only";
import { hasPermission } from "@/lib/authz/has-permission";
import { requirePermission } from "@/lib/authz/require-permission";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { preparedWorkForOpportunity, type PreparedWorkEvidence, type PreparedWorkItem, type PreparedWorkStatus } from "@/lib/prepared-work";
import { getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { Opportunity, OpportunityDocument, OpportunityDocumentType } from "@/lib/types";

const activeDocumentStatuses = ["draft", "edited", "copied", "ready_to_send", "approved"] as const;
const activeStatuses = new Set<PreparedWorkStatus>(["prepared", "ready_for_review", "approved"]);
const documentLimit = 200;
type Row = Record<string, unknown>;

export type PreparedWorkRegistry = {
  items: PreparedWorkItem[];
  counts: Record<"review" | "prepared" | "approved", number>;
  canUpdate: boolean;
};

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberOrNull(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(parsed) ? parsed : null;
}

function projectOpportunity(row: Row, documents: OpportunityDocument[]): Opportunity {
  return {
    id: String(row.id),
    businessId: text(row.business_id),
    organizationId: text(row.organization_id) ?? null,
    title: text(row.title) ?? "Oportunitate fără titlu",
    type: "manual",
    status: "reviewed",
    lifecycleStatus: text(row.lifecycle_status) as Opportunity["lifecycleStatus"],
    ownerProfileId: text(row.owner_profile_id) ?? null,
    currency: text(row.currency) ?? "RON",
    estimatedValueLow: numberOrNull(row.estimated_value_low) as number,
    estimatedValueHigh: numberOrNull(row.estimated_value_high) as number,
    deadline: text(row.deadline),
    city: "",
    county: "",
    fitScore: 0,
    urgencyScore: 0,
    moneyScore: 0,
    confidenceScore: 0,
    summary: "",
    relevance: [],
    risks: [],
    recommendedAction: "",
    rawSourceText: "",
    timeline: [],
    documents,
    actions: []
  };
}

function projectDocument(row: Row): OpportunityDocument {
  return {
    id: String(row.id),
    type: row.document_type as OpportunityDocumentType,
    title: text(row.title) ?? "Document fără titlu",
    content: text(row.body),
    status: row.status as OpportunityDocument["status"],
    generationMode: row.generation_mode as OpportunityDocument["generationMode"],
    createdAt: text(row.created_at),
    editedAt: text(row.edited_at),
    copiedAt: text(row.copied_at),
    readyAt: text(row.ready_at),
    sentAt: text(row.sent_at),
    sendStatus: row.send_status as OpportunityDocument["sendStatus"]
  };
}

function buildRegistry(items: PreparedWorkItem[], canUpdate: boolean): PreparedWorkRegistry {
  const rank = (status: PreparedWorkStatus) => status === "ready_for_review" ? 0 : status === "approved" ? 1 : 2;
  const active = items
    .filter((item) => activeStatuses.has(item.status))
    .sort((left, right) => rank(left.status) - rank(right.status)
      || String(left.deadline ?? "9999-12-31").localeCompare(String(right.deadline ?? "9999-12-31"))
      || left.title.localeCompare(right.title, "ro"));
  return {
    items: active,
    counts: {
      review: active.filter((item) => item.status === "ready_for_review").length,
      prepared: active.filter((item) => item.status === "prepared").length,
      approved: active.filter((item) => item.status === "approved").length
    },
    canUpdate
  };
}

export async function getPreparedWorkRegistry(): Promise<PreparedWorkRegistry> {
  const authorization = await requirePermission("documents.read");
  const canUpdate = hasPermission(authorization, "documents.update");

  if (!isSupabaseConfigured) {
    const opportunities = await getOpportunitiesForCurrentBusiness();
    return buildRegistry(opportunities.flatMap((opportunity) => preparedWorkForOpportunity(opportunity, { canUpdate, requireDocumentType: true })), canUpdate);
  }

  const [current, supabase] = await Promise.all([
    getCurrentBusinessForUser({ redirectIfMissing: true }),
    Promise.resolve(createSupabaseServerClient())
  ]);
  if (!current || !supabase) return buildRegistry([], canUpdate);
  const businessId = current.business.id;

  const { data: documentRows, error: documentError } = await supabase
    .from("opportunity_documents")
    .select("id,business_id,opportunity_id,document_type,title,body,status,generation_mode,created_at,updated_at,edited_at,copied_at,ready_at,sent_at,send_status")
    .eq("business_id", businessId)
    .in("status", [...activeDocumentStatuses])
    .order("updated_at", { ascending: false })
    .limit(documentLimit);
  if (documentError) throw new Error(`Prepared documents lookup failed: ${documentError.message}`);
  if (!documentRows?.length) return buildRegistry([], canUpdate);

  const opportunityIds = Array.from(new Set(documentRows.map((row) => String(row.opportunity_id))));
  const { data: opportunityRows, error: opportunityError } = await supabase
    .from("opportunities")
    .select("id,business_id,organization_id,title,lifecycle_status,owner_profile_id,currency,estimated_value_low,estimated_value_high,deadline")
    .eq("business_id", businessId)
    .in("id", opportunityIds)
    .limit(documentLimit);
  if (opportunityError) throw new Error(`Prepared opportunity lookup failed: ${opportunityError.message}`);

  const organizationIds = Array.from(new Set((opportunityRows ?? []).map((row) => text(row.organization_id)).filter((id): id is string => Boolean(id))));
  const ownerIds = Array.from(new Set((opportunityRows ?? []).map((row) => text(row.owner_profile_id)).filter((id): id is string => Boolean(id))));
  const [{ data: organizations }, { data: owners }, { data: contactLinks }, { data: eventRows }] = await Promise.all([
    organizationIds.length
      ? supabase.from("crm_organizations").select("id,name").eq("business_id", businessId).in("id", organizationIds).limit(documentLimit)
      : Promise.resolve({ data: [] as Row[] }),
    ownerIds.length
      ? supabase.rpc("business_assignable_profiles", { target_business_id: businessId })
      : Promise.resolve({ data: [] as Row[] }),
    supabase.from("opportunity_contacts").select("id,opportunity_id,contact_id,is_primary,crm_contacts!inner(id,full_name,business_id)").eq("business_id", businessId).in("opportunity_id", opportunityIds).order("is_primary", { ascending: false }).limit(documentLimit),
    supabase.from("opportunity_events").select("id,opportunity_id,label,description,occurred_at,metadata").eq("business_id", businessId).in("opportunity_id", opportunityIds).in("event_type", ["document_generated", "document_edited", "document_approved", "document_ready_to_send", "follow_up_approval_invalidated"]).order("occurred_at", { ascending: false }).limit(500)
  ]);

  const organizationById = new Map((organizations ?? []).map((row) => [String(row.id), text(row.name) ?? "Companie"]));
  const ownerById = new Map<string, string>((owners ?? []).map((row: { profile_id: string; full_name: string | null }) => [
    String(row.profile_id),
    text(row.full_name) ?? "Membru echipă"
  ]));
  const contactByOpportunity = new Map<string, { id: string; label: string; href: string }>();
  for (const link of contactLinks ?? []) {
    const contact = link.crm_contacts as unknown as Row | null;
    if (!contact || contact.business_id !== businessId || contactByOpportunity.has(String(link.opportunity_id))) continue;
    contactByOpportunity.set(String(link.opportunity_id), { id: String(contact.id), label: text(contact.full_name) ?? "Contact", href: `/crm/contacts/${contact.id}` });
  }

  const evidenceByDocument = new Map<string, PreparedWorkEvidence[]>();
  for (const event of eventRows ?? []) {
    const metadata = event.metadata as Row | null;
    const documentId = text(metadata?.document_id);
    if (!documentId) continue;
    const existing = evidenceByDocument.get(documentId) ?? [];
    existing.push({ id: String(event.id), label: text(event.label) ?? "Eveniment persistent", description: text(event.description), occurredAt: text(event.occurred_at) });
    evidenceByDocument.set(documentId, existing);
  }

  const documentsByOpportunity = new Map<string, OpportunityDocument[]>();
  for (const row of documentRows) {
    const opportunityId = String(row.opportunity_id);
    documentsByOpportunity.set(opportunityId, [...(documentsByOpportunity.get(opportunityId) ?? []), projectDocument(row as Row)]);
  }

  const items = (opportunityRows ?? []).flatMap((row) => {
    const opportunity = projectOpportunity(row as Row, documentsByOpportunity.get(String(row.id)) ?? []);
    const organizationId = text(row.organization_id);
    const ownerId = text(row.owner_profile_id);
    return opportunity.documents.flatMap((document) => preparedWorkForOpportunity({ ...opportunity, documents: [document] }, {
      canUpdate,
      requireDocumentType: true,
      company: organizationId && organizationById.has(organizationId) ? { id: organizationId, label: organizationById.get(organizationId)!, href: `/crm/organizations/${organizationId}` } : undefined,
      contact: contactByOpportunity.get(opportunity.id),
      owner: ownerId && ownerById.has(ownerId) ? { id: ownerId, label: ownerById.get(ownerId)! } : undefined,
      reason: null,
      evidence: evidenceByDocument.get(document.id) ?? []
    }));
  });

  return buildRegistry(items, canUpdate);
}
