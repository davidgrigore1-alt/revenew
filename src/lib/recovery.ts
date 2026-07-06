import "server-only";
import { getCommercialSignalsForCurrentBusiness } from "@/lib/commercial-inbox";
import { getCurrentBusinessOrDemo, getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";
import type { CommercialSignal, Opportunity } from "@/lib/types";

export type RecoveryAction = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "done" | "cancelled";
  dueAt?: string;
  priority: "low" | "medium" | "high";
  opportunityId?: string;
  opportunityTitle: string;
  company: string;
  reason: string;
  estimatedValue: number;
};

export type RecoveryDocument = {
  id: string;
  status: string;
  opportunityId?: string;
};

export type RecoveryEvent = {
  id: string;
  label: string;
  type: string;
  date?: string;
  opportunityId?: string;
};

export type RecoverySummary = {
  opportunities: Opportunity[];
  signals: CommercialSignal[];
  actions: RecoveryAction[];
  documents: RecoveryDocument[];
  events: RecoveryEvent[];
};

function companyForOpportunity(opportunity: Opportunity) {
  return opportunity.contact?.company || opportunity.contact?.name || opportunity.title;
}

function actionReason(action: Pick<RecoveryAction, "description" | "dueAt" | "priority">, opportunity?: Opportunity) {
  if (action.description) {
    return action.description;
  }

  if (opportunity?.urgencyScore && opportunity.urgencyScore >= 80) {
    return "Oportunitatea are urgență ridicată și merită urmărită rapid.";
  }

  if (action.dueAt) {
    return "Acțiunea are termen stabilit și poate mișca oportunitatea mai departe.";
  }

  return "ReveNew a identificat un pas comercial util pentru această oportunitate.";
}

function mapDemoActions(opportunities: Opportunity[]): RecoveryAction[] {
  return opportunities.flatMap((opportunity) =>
    opportunity.actions.map((action) => ({
      id: action.id,
      title: action.title,
      description: action.description,
      status: action.status,
      dueAt: action.dueDate,
      priority: action.priority ?? "medium",
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      company: companyForOpportunity(opportunity),
      reason: actionReason({ description: action.description, dueAt: action.dueDate, priority: action.priority ?? "medium" }, opportunity),
      estimatedValue: opportunity.estimatedValueHigh
    }))
  );
}

export async function getRecoverySummary(): Promise<RecoverySummary> {
  const opportunities = await getOpportunitiesForCurrentBusiness();
  const signalResult = await getCommercialSignalsForCurrentBusiness();
  const signals = signalResult.tableReady ? signalResult.signals : [];

  if (!isSupabaseConfigured) {
    return {
      opportunities,
      signals,
      actions: mapDemoActions(opportunities),
      documents: opportunities.flatMap((opportunity) => opportunity.documents.map((document) => ({ id: document.id, status: document.status, opportunityId: opportunity.id }))),
      events: opportunities.flatMap((opportunity) => opportunity.timeline.map((event) => ({ id: event.id, label: event.label, type: event.type ?? "event", date: event.date, opportunityId: opportunity.id })))
    };
  }

  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!business || !supabase) {
    return { opportunities, signals, actions: [], documents: [], events: [] };
  }

  const opportunityById = new Map(opportunities.map((opportunity) => [opportunity.id, opportunity]));
  const opportunityIds = opportunities.map((opportunity) => opportunity.id);

  const [{ data: actionRows, error: actionError }, { data: documentRows, error: documentError }] = await Promise.all([
    supabase
      .from("opportunity_actions")
      .select("id,title,description,status,due_at,priority,opportunity_id")
      .eq("business_id", business.id)
      .order("due_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("opportunity_documents")
      .select("id,status,opportunity_id")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
  ]);

  if (actionError) {
    throw new Error(`Recovery actions load error: ${actionError.message}`);
  }

  if (documentError) {
    throw new Error(`Recovery documents load error: ${documentError.message}`);
  }

  let eventRows: Array<{ id: string; label: string; event_type: string; occurred_at: string | null; created_at: string | null; opportunity_id: string }> = [];
  if (opportunityIds.length > 0) {
    const { data, error } = await supabase
      .from("opportunity_events")
      .select("id,label,event_type,occurred_at,created_at,opportunity_id")
      .in("opportunity_id", opportunityIds)
      .order("occurred_at", { ascending: false })
      .limit(30);

    if (error) {
      throw new Error(`Recovery events load error: ${error.message}`);
    }
    eventRows = data ?? [];
  }

  return {
    opportunities,
    signals,
    actions: (actionRows ?? []).map((action) => {
      const opportunity = opportunityById.get(action.opportunity_id);
      const priority = action.priority ?? "medium";
      return {
        id: action.id,
        title: action.title,
        description: action.description ?? "",
        status: action.status,
        dueAt: action.due_at ?? undefined,
        priority,
        opportunityId: action.opportunity_id,
        opportunityTitle: opportunity?.title ?? "Oportunitate",
        company: opportunity ? companyForOpportunity(opportunity) : "Contact neconfirmat",
        reason: actionReason({ description: action.description ?? "", dueAt: action.due_at ?? undefined, priority }, opportunity),
        estimatedValue: opportunity?.estimatedValueHigh ?? 0
      };
    }),
    documents: (documentRows ?? []).map((document) => ({ id: document.id, status: document.status, opportunityId: document.opportunity_id })),
    events: eventRows.map((event) => ({
      id: event.id,
      label: event.label,
      type: event.event_type,
      date: event.occurred_at ?? event.created_at ?? undefined,
      opportunityId: event.opportunity_id
    }))
  };
}

export function recoverableOpportunities(opportunities: Opportunity[]) {
  return opportunities.filter((opportunity) => !["won", "lost", "ignored"].includes(opportunity.status));
}

export function recoverableValue(opportunities: Opportunity[], signals: CommercialSignal[]) {
  const opportunityValue = recoverableOpportunities(opportunities).reduce((sum, opportunity) => sum + opportunity.estimatedValueHigh, 0);
  const signalValue = signals
    .filter((signal) => !signal.convertedOpportunityId && !["converted", "ignored", "archived"].includes(signal.status))
    .reduce((sum, signal) => sum + Number(signal.estimatedValueMax ?? signal.estimatedValueMin ?? 0), 0);
  return opportunityValue + signalValue;
}

export function sourceLabel(source: string) {
  const labels: Record<string, string> = {
    email: "Email",
    website_form: "Formular website",
    phone: "Telefon",
    missed_call: "Apel ratat",
    whatsapp: "WhatsApp",
    csv_import: "Import",
    manual: "Manual",
    referral: "Recomandare",
    instagram: "Instagram",
    other: "Altă sursă"
  };
  return labels[source] ?? source;
}
