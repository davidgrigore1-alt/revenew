import { isOpenOpportunity } from "@/lib/opportunity-domain";
import type { CrmContact, CrmOrganization, Opportunity } from "@/lib/types";

export type ContactOpportunity = Pick<Opportunity, "id" | "businessId" | "title" | "status" | "lifecycleStatus" | "updatedAt">;
export type ContactCoverage = Record<"contacts" | "organizations" | "associations", boolean>;
export type ContactRegistryRow = {
  contact: CrmContact;
  primary: "confirmed" | "ambiguous" | "unknown" | "none";
  active: ContactOpportunity[];
  closedCount: number;
};
export type ContactRegistrySnapshot = { rows: ContactRegistryRow[]; coverage: ContactCoverage };
export type ContactRegistryInput = {
  businessId: string; contacts: CrmContact[]; organizations: CrmOrganization[];
  associations: { businessId: string; contactId: string; opportunity: ContactOpportunity }[];
  coverage: ContactCoverage;
};

export const contactRoleLabels: Record<string, string> = { decision_maker: "Decident", champion: "Campion", influencer: "Influencer", procurement: "Achiziții", finance: "Financiar", legal: "Legal", technical: "Tehnic", operational: "Operațional", other: "Alt rol" };
export const contactFilters = { all: "Contacte active", primary: "Contacte principale", unassociated: "Fără companie", inactive: "Contacte inactive", unknown: "Stare neconfirmată" };
export function normalizeContactFilter(value: string) { return Object.prototype.hasOwnProperty.call(contactFilters, value) ? value : "all"; }
export function normalizeContactSort(value: string) { return ["updated", "name", "company"].includes(value) ? value : "updated"; }

/** Canonical organization only; an opportunity association never supplies it. */
export function buildContactRegistry(input: ContactRegistryInput): ContactRegistrySnapshot {
  const organizations = new Map(input.organizations.filter((item) => item.businessId === input.businessId).map((item) => [item.id, item]));
  const contacts = input.contacts.filter((item) => item.businessId === input.businessId);
  const candidates = new Map<string, Set<string>>();
  for (const contact of contacts) {
    if (contact.isActive !== true || contact.archivedAt || !contact.organizationId || contact.isPrimaryForOrganization !== true) continue;
    const ids = candidates.get(contact.organizationId) ?? new Set<string>();
    ids.add(contact.id); candidates.set(contact.organizationId, ids);
  }
  const associations = new Map<string, Map<string, ContactOpportunity>>();
  for (const link of input.associations) {
    if (link.businessId !== input.businessId || link.opportunity.businessId !== input.businessId) continue;
    const linked = associations.get(link.contactId) ?? new Map<string, ContactOpportunity>();
    linked.set(link.opportunity.id, link.opportunity); associations.set(link.contactId, linked);
  }
  const rows = contacts.map((item): ContactRegistryRow => {
    const organization = organizations.get(item.organizationId ?? "") ?? null;
    const contact = { ...item, organization };
    const count = candidates.get(item.organizationId ?? "")?.size ?? 0;
    const eligible = item.isActive === true && !item.archivedAt && !!item.organizationId && item.isPrimaryForOrganization === true;
    const primary = !eligible ? "none" : count > 1 ? "ambiguous" : !input.coverage.contacts || !organization ? "unknown" : "confirmed";
    const linked = Array.from(associations.get(item.id)?.values() ?? []);
    const active = linked.filter(isOpenOpportunity).sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")) || a.id.localeCompare(b.id));
    return { contact, primary, active, closedCount: linked.length - active.length };
  });
  return { rows, coverage: input.coverage };
}

export function filterContactRegistry(rows: ContactRegistryRow[], query: string, filter: string, sort: string) {
  const needle = query.trim().toLocaleLowerCase("ro-RO");
  const selected = normalizeContactFilter(filter);
  return rows.filter(({ contact, primary }) => {
    const active = contact.isActive === true && !contact.archivedAt;
    if (selected === "inactive" ? contact.isActive !== false && !contact.archivedAt : selected === "unknown" ? contact.isActive != null || !!contact.archivedAt : !active) return false;
    if (selected === "primary" && primary !== "confirmed") return false;
    if (selected === "unassociated" && contact.organizationId) return false;
    return !needle || [contact.fullName, contact.email, contact.phone, contact.jobTitle, contact.organization?.name].filter(Boolean).join(" ").toLocaleLowerCase("ro-RO").includes(needle);
  }).sort((a, b) => {
    if (sort === "company") return String(a.contact.organization?.name ?? "").localeCompare(String(b.contact.organization?.name ?? ""), "ro") || a.contact.fullName.localeCompare(b.contact.fullName, "ro");
    if (sort === "name") return a.contact.fullName.localeCompare(b.contact.fullName, "ro") || a.contact.id.localeCompare(b.contact.id);
    return String(b.contact.updatedAt ?? "").localeCompare(String(a.contact.updatedAt ?? "")) || a.contact.id.localeCompare(b.contact.id);
  });
}
