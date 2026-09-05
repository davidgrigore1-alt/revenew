import { isOpenOpportunity, selectPrimaryNextAction } from "@/lib/opportunity-domain";
import { safeCompanyWebsiteHref } from "@/lib/crm/website";
import type { CrmContact, CrmOrganization, Opportunity, OpportunityAction } from "@/lib/types";

export type RegistryCoverage = Record<"organizations" | "contacts" | "opportunities" | "associations" | "actions" | "events", boolean>;
export type RegistryOpportunity = Pick<Opportunity, "id" | "businessId" | "organizationId" | "status" | "lifecycleStatus" | "ownerProfileId" | "createdAt" | "updatedAt">;
export type RegistryActivity = { source: "organization" | "opportunity" | "opportunity_action" | "opportunity_event"; sourceId: string; label: string; occurredAt: string; href: string };
export type RegistryAttention = { code: "overdue_next_action" | "missing_owner" | "missing_next_action"; label: string; count: number };
export type CompanyRegistryRow = {
  organization: CrmOrganization;
  primaryContact: CrmContact | null;
  contactCount: number;
  activeOpportunities: number;
  attention: RegistryAttention[];
  latestActivity: RegistryActivity | null;
  /** Existing saved-view order: latest event per opportunity, then opportunity/profile update. */
  sortActivityAt: string | null;
};
export type CompanyRegistrySnapshot = { rows: CompanyRegistryRow[]; coverage: RegistryCoverage; observedAt: string };
export type CompanyRegistryInput = {
  businessId: string;
  organizations: CrmOrganization[];
  contacts: CrmContact[];
  opportunities: RegistryOpportunity[];
  associations: { businessId: string; opportunityId: string; contactBusinessId: string; organizationId: string | null }[];
  actions: (OpportunityAction & { businessId: string; opportunityId: string })[];
  events: { id: string; businessId: string; opportunityId: string; label: string; occurredAt: string }[];
  coverage: RegistryCoverage;
};

export const unknownRegistryCoverage: RegistryCoverage = { organizations: false, contacts: false, opportunities: false, associations: false, actions: false, events: false };
export const relationshipLabels: Record<string, string> = { prospect: "Prospect", customer: "Client", partner: "Partener", inactive: "Inactiv" };

export function companyInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.slice(0, 2).map((word) => Array.from(word)[0]).join("") || "?").toLocaleUpperCase("ro-RO");
}

/** Display only: never a source for logo requests or company association. */
export function companyDomain(website?: string | null) {
  const href = safeCompanyWebsiteHref(website);
  return href ? new URL(href).hostname.replace(/^www\./i, "") : null;
}

function latest(current: RegistryActivity | null, candidate: RegistryActivity): RegistryActivity | null {
  const timestamp = Date.parse(candidate.occurredAt);
  if (!Number.isFinite(timestamp)) return current;
  return !current || timestamp > Date.parse(current.occurredAt) ? candidate : current;
}

/** A bounded projection of explicit associations; no provider calls or inferred links. */
export function buildCompanyRegistry(input: CompanyRegistryInput, now = new Date()): CompanyRegistrySnapshot {
  const rows = new Map<string, CompanyRegistryRow>();
  for (const organization of input.organizations) {
    if (organization.businessId !== input.businessId) continue;
    rows.set(organization.id, { organization, primaryContact: null, contactCount: 0, activeOpportunities: 0, attention: [], latestActivity: null, sortActivityAt: null });
  }
  for (const contact of input.contacts) {
    if (contact.businessId !== input.businessId || contact.isActive === false) continue;
    const row = rows.get(contact.organizationId ?? "");
    if (!row) continue;
    row.contactCount++;
    if (contact.isPrimaryForOrganization) row.primaryContact = contact;
  }
  const organizationsByOpportunity = new Map<string, Set<string>>();
  for (const association of input.associations) {
    if (association.businessId !== input.businessId || association.contactBusinessId !== input.businessId || !association.organizationId) continue;
    const ids = organizationsByOpportunity.get(association.opportunityId) ?? new Set<string>();
    ids.add(association.organizationId);
    organizationsByOpportunity.set(association.opportunityId, ids);
  }
  const actionsByOpportunity = new Map<string, CompanyRegistryInput["actions"]>();
  for (const action of input.actions) {
    if (action.businessId !== input.businessId) continue;
    const actions = actionsByOpportunity.get(action.opportunityId) ?? [];
    actions.push(action);
    actionsByOpportunity.set(action.opportunityId, actions);
  }
  const eventsByOpportunity = new Map<string, CompanyRegistryInput["events"]>();
  for (const event of input.events) {
    if (event.businessId !== input.businessId) continue;
    const events = eventsByOpportunity.get(event.opportunityId) ?? [];
    events.push(event);
    eventsByOpportunity.set(event.opportunityId, events);
  }
  const visited = new Set<string>();
  for (const opportunity of input.opportunities) {
    if (opportunity.businessId !== input.businessId || visited.has(opportunity.id)) continue;
    visited.add(opportunity.id);
    const ids = organizationsByOpportunity.get(opportunity.id) ?? new Set<string>();
    if (opportunity.organizationId) ids.add(opportunity.organizationId);
    const actions = actionsByOpportunity.get(opportunity.id) ?? [];
    const nextAction = selectPrimaryNextAction(actions);
    const href = `/opportunities/${opportunity.id}`;
    let activity = latest(null, { source: "opportunity", sourceId: opportunity.id, label: opportunity.updatedAt && opportunity.updatedAt !== opportunity.createdAt ? "Oportunitate actualizată" : "Oportunitate creată", occurredAt: opportunity.updatedAt ?? opportunity.createdAt ?? "", href });
    for (const action of actions) {
      activity = latest(activity, { source: "opportunity_action", sourceId: action.id, label: "Acțiune actualizată", occurredAt: action.updatedAt ?? action.createdAt ?? "", href: `${href}#workflow-actions` });
    }
    let latestEvent: RegistryActivity | null = null;
    for (const event of eventsByOpportunity.get(opportunity.id) ?? []) {
      const candidate: RegistryActivity = { source: "opportunity_event", sourceId: event.id, label: event.label || "Eveniment în oportunitate", occurredAt: event.occurredAt, href };
      activity = latest(activity, candidate);
      latestEvent = latest(latestEvent, candidate);
    }
    const sortActivityAt = latestEvent?.occurredAt ?? opportunity.updatedAt ?? opportunity.createdAt;
    for (const id of Array.from(ids)) {
      const row = rows.get(id);
      if (!row) continue;
      if (activity) row.latestActivity = latest(row.latestActivity, activity);
      if (sortActivityAt && (!row.sortActivityAt || sortActivityAt > row.sortActivityAt)) row.sortActivityAt = sortActivityAt;
      if (!isOpenOpportunity(opportunity)) continue;
      row.activeOpportunities++;
      const add = (code: RegistryAttention["code"], label: string) => {
        const item = row.attention.find((entry) => entry.code === code);
        if (item) item.count++; else row.attention.push({ code, label, count: 1 });
      };
      // Same predicates as Company Intelligence. Missing actions require complete evidence.
      if (nextAction?.dueDate && nextAction.dueDate < now.toISOString()) add("overdue_next_action", "Follow-up întârziat");
      if (!opportunity.ownerProfileId) add("missing_owner", "Responsabil neatribuit");
      if (input.coverage.actions && !nextAction) add("missing_next_action", "Pas următor lipsă");
    }
  }
  const order: RegistryAttention["code"][] = ["overdue_next_action", "missing_owner", "missing_next_action"];
  for (const row of Array.from(rows.values())) {
    row.attention.sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code));
    // Profile changes are administrative evidence, explicitly distinguished from activity.
    if (!row.latestActivity) row.latestActivity = latest(null, { source: "organization", sourceId: row.organization.id, label: "Profil actualizat", occurredAt: row.organization.updatedAt ?? row.organization.createdAt ?? "", href: `/crm/organizations/${row.organization.id}` });
  }
  return { rows: Array.from(rows.values()), coverage: input.coverage, observedAt: now.toISOString() };
}

export function filterCompanyRegistry(rows: CompanyRegistryRow[], query: string, relationship: string, sort: string) {
  const normalized = query.trim().toLocaleLowerCase("ro-RO");
  return rows.filter(({ organization }) => (!normalized || `${organization.name} ${organization.industry ?? ""} ${organization.city ?? ""}`.toLocaleLowerCase("ro-RO").includes(normalized)) && (relationship === "all" || organization.relationshipStatus === relationship))
    .sort((a, b) => {
      if (sort === "name") return a.organization.name.localeCompare(b.organization.name, "ro") || a.organization.id.localeCompare(b.organization.id);
      if (sort === "opportunities") return b.activeOpportunities - a.activeOpportunities || a.organization.id.localeCompare(b.organization.id);
      return String(b.sortActivityAt ?? b.organization.updatedAt ?? "").localeCompare(String(a.sortActivityAt ?? a.organization.updatedAt ?? "")) || a.organization.id.localeCompare(b.organization.id);
    });
}

export function registryActivityTime(occurredAt: string, observedAt: string) {
  const date = new Date(occurredAt);
  const exact = new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Bucharest" }).format(date);
  const minutes = Math.floor((Date.parse(observedAt) - date.getTime()) / 60_000);
  const days = Math.floor(minutes / 1440);
  const relative = minutes < 0 ? exact : minutes < 1 ? "Acum" : minutes < 60 ? `Acum ${minutes} min` : minutes < 1440 ? `Acum ${Math.floor(minutes / 60)} h` : minutes < 10080 ? days === 1 ? "Acum o zi" : `Acum ${days} zile` : new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Bucharest" }).format(date);
  return { exact, relative };
}
