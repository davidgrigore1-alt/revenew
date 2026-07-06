import "server-only";
import { redirect } from "next/navigation";
import { opportunities as demoOpportunities } from "@/lib/mock-data";
import type {
  CrmOrganization,
  Opportunity,
  OpportunityAction,
  OpportunityContact,
  OpportunityDocument,
  OpportunityEvent
} from "@/lib/types";
import { getCurrentAuthUser } from "@/lib/auth/profile";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
import { isMissingRelationError } from "@/lib/supabase/database-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

type OpportunityRow = {
  id: string;
  title: string;
  type: Opportunity["type"];
  status: Opportunity["status"];
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  deadline: string | null;
  city: string | null;
  county: string | null;
  fit_score: number | null;
  urgency_score: number | null;
  money_score: number | null;
  confidence_score: number | null;
  summary: string | null;
  relevance: string[] | null;
  risks: string[] | null;
  recommended_action: string | null;
  raw_source_text: string | null;
  source_url?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  ai_summary?: string | null;
  why_relevant?: string | null;
  analysis_mode?: "ai" | "local_fallback" | null;
  source_id?: string | null;
};

type CrmOrganizationRow = {
  id: string;
  business_id: string;
  name: string;
  website: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type CrmContactRow = {
  id: string;
  business_id: string;
  organization_id: string | null;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  professional_url: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  crm_organizations?: CrmOrganizationRow | CrmOrganizationRow[] | null;
};

type OpportunityContactRow = {
  id: string;
  business_id: string;
  opportunity_id: string;
  contact_id: string;
  role: string | null;
  is_primary: boolean | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  crm_contacts?: CrmContactRow | CrmContactRow[] | null;
};

function firstJoinRow<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function mapCrmOrganization(row: CrmOrganizationRow | null): CrmOrganization | null {
  if (!row) return null;

  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    website: row.website,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapOpportunityContacts(rows: OpportunityContactRow[] = []): OpportunityContact[] {
  const mapped: OpportunityContact[] = [];

  for (const row of rows) {
    const contact = firstJoinRow(row.crm_contacts);
    if (!contact) continue;

    mapped.push({
      id: row.id,
      businessId: row.business_id,
      opportunityId: row.opportunity_id,
      contactId: row.contact_id,
      role: row.role,
      isPrimary: Boolean(row.is_primary),
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      contact: {
        id: contact.id,
        businessId: contact.business_id,
        organizationId: contact.organization_id,
        organization: mapCrmOrganization(firstJoinRow(contact.crm_organizations)),
        fullName: contact.full_name,
        jobTitle: contact.job_title,
        email: contact.email,
        phone: contact.phone,
        professionalUrl: contact.professional_url,
        notes: contact.notes,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
      }
    });
  }

  return mapped;
}

function mapOpportunity(
  row: OpportunityRow,
  actions: OpportunityAction[] = [],
  documents: OpportunityDocument[] = [],
  events: OpportunityEvent[] = [],
  contacts: OpportunityContact[] = []
): Opportunity {
  const primaryContact = contacts.find((item) => item.isPrimary) ?? contacts[0];
  const legacyContact =
    row.contact_name || row.contact_email || row.contact_phone
      ? {
          name: row.contact_name ?? "Contact neconfirmat",
          role: "Contact oportunitate",
          email: row.contact_email ?? undefined,
          phone: row.contact_phone ?? undefined,
          company: ""
        }
      : primaryContact
        ? {
            name: primaryContact.contact.fullName,
            role: primaryContact.role ?? primaryContact.contact.jobTitle ?? "Contact oportunitate",
            email: primaryContact.contact.email ?? undefined,
            phone: primaryContact.contact.phone ?? undefined,
            company: primaryContact.contact.organization?.name ?? ""
          }
        : undefined;

  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    source: row.analysis_mode === "ai" ? "Supabase + AI" : "Supabase",
    sourceUrl: row.source_url ?? undefined,
    estimatedValueLow: Number(row.estimated_value_low ?? 0),
    estimatedValueHigh: Number(row.estimated_value_high ?? 0),
    deadline: row.deadline ?? undefined,
    city: row.city ?? "",
    county: row.county ?? "",
    fitScore: Number(row.fit_score ?? 0),
    urgencyScore: Number(row.urgency_score ?? 0),
    moneyScore: Number(row.money_score ?? 0),
    confidenceScore: Number(row.confidence_score ?? 0),
    analysisMode: row.analysis_mode ?? undefined,
    contact: legacyContact,
    summary: row.ai_summary ?? row.summary ?? "",
    relevance: row.why_relevant ? [row.why_relevant, ...(row.relevance ?? [])] : row.relevance ?? [],
    risks: row.risks ?? [],
    recommendedAction: row.recommended_action ?? "",
    rawSourceText: row.raw_source_text ?? "",
    timeline: events,
    documents,
    actions,
    contacts
  };
}

export async function requireUserIfSupabase() {
  if (!isSupabaseConfigured) {
    return null;
  }

  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getCurrentBusinessOrDemo({ redirectIfMissing = false } = {}) {
  const result = await getCurrentBusinessForUser({ redirectIfMissing });
  return result?.business ?? null;
}

export async function getOpportunitiesForCurrentBusiness() {
  if (!isSupabaseConfigured) {
    return demoOpportunities;
  }

  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const business = current?.business;
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase nu este disponibil pe server.");
  }

  if (!business) {
    throw new Error("Nu am găsit businessul curent.");
  }

  const { data, error } = await supabase
    .from("opportunities")
    .select("*")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Opportunity load error: ${error.message}`);
  }

  return (data ?? []).map((row) => mapOpportunity(row as OpportunityRow));
}

export async function getOpportunityForCurrentBusiness(id: string) {
  if (!isSupabaseConfigured) {
    return demoOpportunities.find((item) => item.id === id) ?? null;
  }

  const current = await getCurrentBusinessForUser({ redirectIfMissing: true });
  const business = current?.business;
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase nu este disponibil pe server.");
  }

  if (!business) {
    throw new Error("Nu am găsit businessul curent.");
  }

  const [
    { data: opportunity, error: opportunityError },
    { data: actions, error: actionsError },
    { data: documents, error: documentsError },
    { data: events, error: eventsError },
    { data: contacts, error: contactsError }
  ] = await Promise.all([
    supabase.from("opportunities").select("*").eq("id", id).eq("business_id", business.id).single(),
    supabase.from("opportunity_actions").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
    supabase.from("opportunity_documents").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
    supabase.from("opportunity_events").select("*").eq("opportunity_id", id).order("created_at", { ascending: true }),
    supabase
      .from("opportunity_contacts")
      .select(
        "id,business_id,opportunity_id,contact_id,role,is_primary,notes,created_at,updated_at,crm_contacts(id,business_id,organization_id,full_name,job_title,email,phone,professional_url,notes,created_at,updated_at,crm_organizations(id,business_id,name,website,notes,created_at,updated_at))"
      )
      .eq("opportunity_id", id)
      .eq("business_id", business.id)
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false })
  ]);

  if (opportunityError) {
    if (opportunityError.code === "PGRST116") {
      return null;
    }
    throw new Error(`Opportunity detail load error: ${opportunityError.message}`);
  }

  if (actionsError) {
    throw new Error(`Opportunity actions load error: ${actionsError.message}`);
  }

  if (documentsError) {
    throw new Error(`Opportunity documents load error: ${documentsError.message}`);
  }

  if (eventsError) {
    throw new Error(`Opportunity events load error: ${eventsError.message}`);
  }

  if (contactsError && !isMissingRelationError(contactsError, "opportunity_contacts")) {
    throw new Error(`Opportunity contacts load error: ${contactsError.message}`);
  }

  if (!opportunity) {
    return null;
  }

  const mappedActions: OpportunityAction[] = (actions ?? []).map((action) => ({
    id: action.id,
    type: action.type,
    title: action.title,
    description: action.description ?? "",
    status: action.status,
    dueDate: action.due_at ?? action.created_at,
    priority: action.priority ?? "medium",
    completedAt: action.completed_at ?? undefined,
    cancelledAt: action.cancelled_at ?? undefined
  }));

  const mappedDocuments: OpportunityDocument[] = (documents ?? []).map((document) => ({
    id: document.id,
    type: document.document_type,
    title: document.title,
    content: document.body ?? "",
    status: document.status ?? "draft",
    generationMode: document.generation_mode ?? undefined,
    createdAt: document.created_at ?? undefined,
    editedAt: document.edited_at ?? undefined,
    copiedAt: document.copied_at ?? undefined,
    readyAt: document.ready_at ?? undefined,
    sentAt: document.sent_at ?? undefined
  }));

  const mappedEvents: OpportunityEvent[] = (events ?? []).map((event) => ({
    id: event.id,
    type: event.event_type,
    label: event.label,
    description: event.description ?? "",
    date: event.occurred_at ?? event.created_at
  }));

  const mappedContacts = contactsError ? [] : mapOpportunityContacts((contacts ?? []) as OpportunityContactRow[]);

  return mapOpportunity(opportunity as OpportunityRow, mappedActions, mappedDocuments, mappedEvents, mappedContacts);
}
