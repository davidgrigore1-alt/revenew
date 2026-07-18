import "server-only";
import type {
  CommercialPipelineStage,
  CrmContact,
  CrmOrganization,
  Opportunity,
  OpportunityAction,
  OpportunityStatus
} from "@/lib/types";
import { getAuthorizationContext } from "@/lib/authz/get-authorization-context";
import { assessOpportunityAttention } from "@/lib/opportunity-attention";
import { applicationDateKey, isOpenOpportunity, lifecycleForOpportunity, stageForLegacyStatus, stageForOpportunity } from "@/lib/opportunity-domain";
import { getRecoverySummary, type RecoveryAction } from "@/lib/recovery";
import { getCurrentBusinessOrDemo, getOpportunitiesForCurrentBusiness } from "@/lib/supabase/data";
import { isMissingRelationError } from "@/lib/supabase/database-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/status";

export const pipelineStages: Array<{
  id: CommercialPipelineStage;
  label: string;
  statuses: OpportunityStatus[];
  nextStatus: OpportunityStatus;
}> = [
  { id: "lead", label: "Lead", statuses: ["new", "reviewed"], nextStatus: "reviewed" },
  { id: "qualified", label: "Calificat", statuses: ["action_generated", "contacted"], nextStatus: "contacted" },
  { id: "proposal", label: "Propunere", statuses: ["follow_up_needed"], nextStatus: "follow_up_needed" },
  { id: "won", label: "Câștigat", statuses: ["won"], nextStatus: "won" },
  { id: "lost", label: "Pierdut", statuses: ["lost", "ignored"], nextStatus: "lost" }
];

function sameDay(value: string | undefined, dayKey: string) {
  return value?.slice(0, 10) === dayKey;
}

function beforeDay(value: string | undefined, dayKey: string) {
  return Boolean(value && value.slice(0, 10) < dayKey);
}

export function stageForStatus(status: OpportunityStatus): CommercialPipelineStage {
  return stageForLegacyStatus(status);
}

export function activePipelineValue(opportunities: Opportunity[]) {
  return opportunities
    .filter((opportunity) => isOpenOpportunity(opportunity) && (opportunity.currency ?? "RON") === "RON")
    .reduce((sum, opportunity) => sum + Number(opportunity.estimatedValueHigh ?? 0), 0);
}

export function opportunityAgeDays(opportunity: Opportunity) {
  const firstEvent = opportunity.createdAt ?? opportunity.timeline[0]?.date;
  const anchor = firstEvent ? new Date(firstEvent) : new Date();
  const age = Math.floor((Date.now() - anchor.getTime()) / 86400000);
  return Number.isFinite(age) ? Math.max(age, 0) : 0;
}

export function getPrimaryContact(opportunity: Opportunity) {
  return opportunity.contacts?.find((contact) => contact.isPrimary) ?? opportunity.contacts?.[0] ?? null;
}

export function hasScheduledNextAction(opportunity: Opportunity) {
  return opportunity.actions.some((action) => action.status === "pending" && Boolean(action.dueDate));
}

export async function getRevenueWorkspaceSummary() {
  const [summary, authorization] = await Promise.all([getRecoverySummary(), getAuthorizationContext()]);
  const today = applicationDateKey();
  const opportunities = summary.opportunities;
  const active = opportunities.filter(isOpenOpportunity);
  const won = opportunities.filter((opportunity) => opportunity.lifecycleStatus === "won" || (!opportunity.lifecycleStatus && opportunity.status === "won"));
  const createdThisMonth = opportunities.filter((opportunity) => opportunity.createdAt?.slice(0, 7) === today.slice(0, 7));
  const visiblePersonalActions = !isSupabaseConfigured || !authorization.profileId
    ? summary.actions
    : summary.actions.filter((action) => action.assignedToProfileId === authorization.profileId);
  const overdue = visiblePersonalActions.filter((action) => action.status === "pending" && beforeDay(action.dueAt, today));
  const dueToday = visiblePersonalActions.filter((action) => action.status === "pending" && sameDay(action.dueAt, today));
  const isManager = ["business_owner", "business_admin", "business_manager"].includes(authorization.businessRole ?? "");
  const operationallyVisible = isManager ? active : active.filter((opportunity) => Boolean(opportunity.ownerProfileId));
  const withoutPrimaryContact = operationallyVisible.filter((opportunity) => !getPrimaryContact(opportunity));
  const withoutNextAction = operationallyVisible.filter((opportunity) => !hasScheduledNextAction(opportunity));
  const ageTotal = active.reduce((sum, opportunity) => sum + opportunityAgeDays(opportunity), 0);
  const attention = operationallyVisible.map((opportunity) => ({
    opportunity,
    assessment: assessOpportunityAttention(opportunity)
  })).sort((left, right) => {
    const rank = { at_risk: 3, blocked: 3, needs_attention: 2, on_track: 1, closed: 0 };
    return rank[right.assessment.state] - rank[left.assessment.state]
      || right.opportunity.estimatedValueHigh - left.opportunity.estimatedValueHigh
      || String(right.opportunity.updatedAt ?? "").localeCompare(String(left.opportunity.updatedAt ?? ""))
      || left.opportunity.id.localeCompare(right.opportunity.id);
  });
  const recoveredThisMonth = won.filter((opportunity) => opportunity.outcomeDate?.slice(0, 7) === today.slice(0, 7));
  const recoveredByCurrency = recoveredThisMonth.reduce<Record<string, number>>((totals, opportunity) => {
    const currency = opportunity.currency ?? "RON";
    totals[currency] = (totals[currency] ?? 0) + Number(opportunity.actualOutcomeAmount ?? 0);
    return totals;
  }, {});

  return {
    ...summary,
    today,
    activeOpportunities: active,
    metrics: {
      activePipelineValue: activePipelineValue(opportunities),
      wonRevenue: recoveredByCurrency.RON ?? 0,
      recoveredByCurrency,
      recoveredPeriod: today.slice(0, 7),
      opportunitiesCreatedThisMonth: createdThisMonth.length,
      opportunitiesWonThisMonth: won.filter((opportunity) => opportunity.outcomeDate?.slice(0, 7) === today.slice(0, 7)).length,
      conversionRate: opportunities.length > 0 ? Math.round((won.length / opportunities.length) * 100) : null,
      overdueFollowUps: overdue.length,
      dueTodayTasks: dueToday.length,
      averageOpportunityAgeDays: active.length > 0 ? Math.round(ageTotal / active.length) : null,
      missingPrimaryContact: withoutPrimaryContact.length,
      missingNextAction: withoutNextAction.length
    },
    workQueue: {
      allPersonal: visiblePersonalActions,
      overdue,
      dueToday,
      upcoming: visiblePersonalActions
        .filter((action) => action.status === "pending" && action.dueAt && action.dueAt.slice(0, 10) > today)
        .slice(0, 12),
      completedToday: visiblePersonalActions.filter((action) => action.status === "done" && sameDay(action.completedAt, today))
    },
    warnings: {
      withoutPrimaryContact,
      withoutNextAction,
      attention: attention.filter((item) => item.assessment.state !== "on_track").slice(0, 12),
      highValueAtRisk: attention.filter((item) => item.assessment.state === "at_risk").slice(0, 8),
      unassigned: isManager ? active.filter((opportunity) => !opportunity.ownerProfileId).slice(0, 12) : [],
      recentlyChanged: [...(isManager ? opportunities : opportunities.filter((opportunity) => Boolean(opportunity.ownerProfileId)))]
        .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")) || left.id.localeCompare(right.id))
        .slice(0, 8)
    },
    viewer: { profileId: authorization.profileId, isManager }
  };
}

type CrmOrganizationRow = {
  id: string;
  business_id: string;
  name: string;
  normalized_name?: string | null;
  website?: string | null;
  industry?: string | null;
  phone?: string | null;
  city?: string | null;
  county?: string | null;
  country?: string | null;
  notes?: string | null;
  relationship_status?: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CrmContactRow = {
  id: string;
  business_id: string;
  organization_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name: string;
  job_title: string | null;
  department?: string | null;
  decision_role?: string | null;
  email: string | null;
  phone: string | null;
  professional_url: string | null;
  is_active?: boolean | null;
  is_primary_for_organization?: boolean | null;
  archived_at?: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function getCrmWorkspaceForCurrentBusiness(): Promise<{
  ready: boolean;
  organizations: CrmOrganization[];
  contacts: CrmContact[];
  error?: string;
}> {
  if (!isSupabaseConfigured) {
    return { ready: false, organizations: [], contacts: [], error: "CRM-ul real este disponibil după configurarea Supabase." };
  }

  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!business || !supabase) {
    return { ready: false, organizations: [], contacts: [], error: "Nu am putut încărca workspace-ul curent." };
  }

  const [organizationResult, contactResult] = await Promise.all([
    supabase
      .from("crm_organizations")
      .select("id,business_id,name,normalized_name,website,industry,phone,city,county,country,relationship_status,notes,is_archived,archived_at,created_at,updated_at")
      .eq("business_id", business.id)
      .eq("is_archived", false)
      .order("updated_at", { ascending: false }),
    supabase
      .from("crm_contacts")
      .select("id,business_id,organization_id,first_name,last_name,full_name,job_title,department,decision_role,email,phone,professional_url,is_active,is_primary_for_organization,notes,archived_at,created_at,updated_at")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
  ]);

  if (organizationResult.error || contactResult.error) {
    const error = organizationResult.error ?? contactResult.error;
    if (
      isMissingRelationError(error, "crm_organizations") ||
      isMissingRelationError(error, "crm_contacts")
    ) {
      return { ready: false, organizations: [], contacts: [], error: "Tabelele CRM lipsesc din baza de date. Aplică migrarea CRM foundation înainte de utilizare." };
    }
    if (typeof error === "object" && error !== null && "code" in error && String(error.code) === "42703") {
      return { ready: false, organizations: [], contacts: [], error: "Schema CRM există, dar coloanele CRUD lipsesc. Aplică migrarea 202607060002_crm_workspace_crud.sql." };
    }
    return { ready: false, organizations: [], contacts: [], error: "Datele CRM nu au putut fi încărcate." };
  }

  const organizations = ((organizationResult.data ?? []) as CrmOrganizationRow[]).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    normalizedName: row.normalized_name,
    website: row.website,
    industry: row.industry,
    phone: row.phone,
    city: row.city,
    county: row.county,
    country: row.country,
    notes: row.notes,
    relationshipStatus: row.relationship_status,
    isArchived: row.is_archived,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
  const organizationById = new Map(organizations.map((organization) => [organization.id, organization]));

  const contacts = ((contactResult.data ?? []) as CrmContactRow[]).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    organizationId: row.organization_id,
    organization: row.organization_id ? organizationById.get(row.organization_id) ?? null : null,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: row.full_name,
    jobTitle: row.job_title,
    department: row.department,
    decisionRole: row.decision_role,
    email: row.email,
    phone: row.phone,
    professionalUrl: row.professional_url,
    isActive: row.is_active,
    isPrimaryForOrganization: row.is_primary_for_organization,
    archivedAt: row.archived_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  return { ready: true, organizations, contacts };
}

export async function getCrmOrganizationDetail(organizationId: string) {
  const crm = await getCrmWorkspaceForCurrentBusiness();
  if (!crm.ready) return { ready: false as const, error: crm.error, organization: null, contacts: [], opportunities: [], events: [] };

  const organization = crm.organizations.find((item) => item.id === organizationId) ?? null;
  if (!organization) return { ready: true as const, organization: null, contacts: [], opportunities: [], events: [] };

  const contacts = crm.contacts.filter((contact) => contact.organizationId === organizationId);
  const opportunities = (await getOpportunitiesForCurrentBusiness()).filter((opportunity) =>
    opportunity.organizationId === organizationId || opportunity.contacts?.some((contact) => contact.contact.organizationId === organizationId)
  );
  const events = opportunities.flatMap((opportunity) =>
    opportunity.timeline.map((event) => ({
      ...event,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title
    }))
  ).sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return { ready: true as const, organization, contacts, opportunities, events };
}

export async function getCrmOrganizationStats() {
  const opportunities = await getOpportunitiesForCurrentBusiness();
  const stats: Record<string, { activeOpportunities: number; lastActivity?: string }> = {};

  for (const opportunity of opportunities) {
    const organizationIds = new Set<string>();
    if (opportunity.organizationId) organizationIds.add(opportunity.organizationId);
    for (const association of opportunity.contacts ?? []) {
      if (association.contact.organizationId) organizationIds.add(association.contact.organizationId);
    }
    for (const organizationId of Array.from(organizationIds)) {
      const current = stats[organizationId] ?? { activeOpportunities: 0, lastActivity: undefined };
      if (!["won", "lost", "disqualified", "archived"].includes(opportunity.lifecycleStatus ?? "open")) current.activeOpportunities += 1;
      const lastActivity = opportunity.timeline[0]?.date ?? opportunity.updatedAt ?? opportunity.createdAt;
      if (lastActivity && (!current.lastActivity || lastActivity > current.lastActivity)) current.lastActivity = lastActivity;
      stats[organizationId] = current;
    }
  }

  return stats;
}

export type NextBestAction = {
  action: string;
  reason: string;
  urgency: "low" | "medium" | "high";
  missingInformation: string[];
  channel: "email" | "phone" | "meeting" | "internal_review";
  suggestedDueDate?: string;
};

export function recommendNextBestAction(opportunity: Opportunity): NextBestAction {
  const primaryContact = getPrimaryContact(opportunity);
  const pendingActions = opportunity.actions.filter((action) => action.status === "pending");
  const overdue = pendingActions.find((action) => action.dueDate && action.dueDate.slice(0, 10) < applicationDateKey());
  const missingInformation: string[] = [];

  if (!primaryContact && !opportunity.contact?.email && !opportunity.contact?.phone) missingInformation.push("contact principal");
  if (!opportunity.estimatedValueHigh) missingInformation.push("valoare comercială estimată");
  if (!opportunity.deadline) missingInformation.push("termen de decizie");
  if (!opportunity.rawSourceText && !opportunity.summary) missingInformation.push("context comercial sursă");

  if (overdue) {
    return {
      action: "Rezolvă follow-up-ul restant",
      reason: `${overdue.title} este depășit și poate bloca avansarea oportunității.`,
      urgency: "high",
      missingInformation,
      channel: overdue.type === "call_contact" ? "phone" : "email",
      suggestedDueDate: new Date().toISOString()
    };
  }

  if (!primaryContact) {
    return {
      action: "Confirmă persoana responsabilă de decizie",
      reason: "Oportunitatea nu are contact principal, iar outreach-ul riscă să rămână generic.",
      urgency: "high",
      missingInformation,
      channel: "internal_review",
      suggestedDueDate: new Date(Date.now() + 86400000).toISOString()
    };
  }

  if (opportunity.status === "new" || opportunity.status === "reviewed") {
    return {
      action: "Contactează decidentul sau campionul comercial",
      reason: "Oportunitatea este încă în etapa de calificare și are nevoie de confirmarea nevoii.",
      urgency: opportunity.urgencyScore >= 70 ? "high" : "medium",
      missingInformation,
      channel: primaryContact.contact.phone ? "phone" : "email",
      suggestedDueDate: new Date(Date.now() + 86400000).toISOString()
    };
  }

  if (opportunity.documents.some((document) => document.type === "offer_draft" && ["draft", "edited", "ready_to_send"].includes(document.status))) {
    return {
      action: "Revizuiește și trimite oferta pregătită",
      reason: "Există un draft de ofertă în workspace care poate transforma oportunitatea în propunere concretă.",
      urgency: opportunity.deadline ? "high" : "medium",
      missingInformation,
      channel: "email",
      suggestedDueDate: opportunity.deadline ?? new Date(Date.now() + 2 * 86400000).toISOString()
    };
  }

  return {
    action: "Programează următorul follow-up",
    reason: "Nu există un pas următor suficient de clar pentru această oportunitate.",
    urgency: missingInformation.length > 0 ? "medium" : "low",
    missingInformation,
    channel: primaryContact.contact.email ? "email" : "internal_review",
    suggestedDueDate: new Date(Date.now() + 3 * 86400000).toISOString()
  };
}

export function taskBuckets(actions: RecoveryAction[], today = applicationDateKey()) {
  return {
    overdue: actions.filter((action) => action.status === "pending" && beforeDay(action.dueAt, today)),
    dueToday: actions.filter((action) => action.status === "pending" && sameDay(action.dueAt, today)),
    upcoming: actions.filter((action) => action.status === "pending" && action.dueAt && action.dueAt.slice(0, 10) > today),
    completedToday: actions.filter((action) => action.status === "done" && sameDay(action.dueAt, today))
  };
}

export async function getPipelineOpportunities() {
  const opportunities = await getOpportunitiesForCurrentBusiness();
  return pipelineStages.map((stage) => {
    const items = opportunities.filter((opportunity) => lifecycleForOpportunity(opportunity) !== "archived" && stageForOpportunity(opportunity) === stage.id);
    return {
      ...stage,
      opportunities: items,
      count: items.length,
      totalValue: items.reduce((sum, opportunity) => sum + ((opportunity.currency ?? "RON") === "RON" ? Number(
        stage.id === "won" ? opportunity.actualOutcomeAmount ?? 0 : stage.id === "lost" ? 0 : opportunity.estimatedValueHigh ?? 0
      ) : 0), 0)
    };
  });
}

export async function getAssignableProfilesForCurrentBusiness(): Promise<Array<{ id: string; fullName: string }>> {
  if (!isSupabaseConfigured) return [];
  const business = await getCurrentBusinessOrDemo({ redirectIfMissing: true });
  const supabase = createSupabaseServerClient();
  if (!business || !supabase) return [];
  const { data, error } = await supabase.rpc("business_assignable_profiles", { target_business_id: business.id });
  if (error) {
    console.warn("assignable_profiles_unavailable", { code: error.code });
    return [];
  }
  return (data ?? []).map((row: { profile_id: string; full_name: string }) => ({ id: row.profile_id, fullName: row.full_name }));
}
