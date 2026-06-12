import "server-only";
import { redirect } from "next/navigation";
import { opportunities as demoOpportunities } from "@/lib/mock-data";
import type { Opportunity, OpportunityAction, OpportunityDocument, OpportunityEvent } from "@/lib/types";
import { getCurrentAuthUser } from "@/lib/auth/profile";
import { getCurrentBusinessForUser } from "@/lib/business/current-business";
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

function mapOpportunity(row: OpportunityRow, actions: OpportunityAction[] = [], documents: OpportunityDocument[] = [], events: OpportunityEvent[] = []): Opportunity {
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
    contact: row.contact_name || row.contact_email || row.contact_phone
      ? {
          name: row.contact_name ?? "Contact neconfirmat",
          role: "Contact oportunitate",
          email: row.contact_email ?? undefined,
          phone: row.contact_phone ?? undefined,
          company: ""
        }
      : undefined,
    summary: row.ai_summary ?? row.summary ?? "",
    relevance: row.why_relevant ? [row.why_relevant, ...(row.relevance ?? [])] : row.relevance ?? [],
    risks: row.risks ?? [],
    recommendedAction: row.recommended_action ?? "",
    rawSourceText: row.raw_source_text ?? "",
    timeline: events,
    documents,
    actions
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
    { data: events, error: eventsError }
  ] = await Promise.all([
    supabase.from("opportunities").select("*").eq("id", id).eq("business_id", business.id).single(),
    supabase.from("opportunity_actions").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
    supabase.from("opportunity_documents").select("*").eq("opportunity_id", id).order("created_at", { ascending: false }),
    supabase.from("opportunity_events").select("*").eq("opportunity_id", id).order("created_at", { ascending: true })
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

  return mapOpportunity(opportunity as OpportunityRow, mappedActions, mappedDocuments, mappedEvents);
}
