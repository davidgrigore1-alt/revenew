"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { archiveCrmContact, archiveCrmOrganization, saveCrmContact, saveCrmOrganization } from "@/lib/crm/workspace-actions";
import type { CrmContact, CrmOrganization } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type CrmWorkspaceClientProps = {
  organizations: CrmOrganization[];
  contacts: CrmContact[];
  view?: "all" | "companies" | "contacts";
  organizationStats?: Record<string, { activeOpportunities: number; lastActivity?: string }>;
};

const roleOptions = [
  ["decision_maker", "Decident"],
  ["champion", "Campion"],
  ["influencer", "Influencer"],
  ["procurement", "Achiziții"],
  ["finance", "Financiar"],
  ["legal", "Legal"],
  ["technical", "Tehnic"],
  ["operational", "Operațional"],
  ["other", "Alt rol"]
];

export function CrmWorkspaceClient({ organizations, contacts, view = "all", organizationStats = {} }: CrmWorkspaceClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editingOrganization, setEditingOrganization] = useState<CrmOrganization | null>(null);
  const [editingContact, setEditingContact] = useState<CrmContact | null>(null);
  const [panel, setPanel] = useState<"organization" | "contact" | null>(null);
  const [query, setQuery] = useState("");
  const [relationship, setRelationship] = useState("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("ro-RO");
  const filteredOrganizations = useMemo(() => organizations.filter((organization) => {
    const matchesQuery = !normalizedQuery || `${organization.name} ${organization.industry ?? ""} ${organization.city ?? ""}`.toLocaleLowerCase("ro-RO").includes(normalizedQuery);
    return matchesQuery && (relationship === "all" || organization.relationshipStatus === relationship);
  }), [organizations, normalizedQuery, relationship]);
  const filteredContacts = useMemo(() => contacts.filter((contact) => !normalizedQuery || `${contact.fullName} ${contact.email ?? ""} ${contact.phone ?? ""} ${contact.jobTitle ?? ""} ${contact.organization?.name ?? ""}`.toLocaleLowerCase("ro-RO").includes(normalizedQuery)), [contacts, normalizedQuery]);

  useEffect(() => {
    if (!panel) return;
    panelRef.current?.querySelector<HTMLElement>("input:not([type='hidden']), select, textarea")?.focus();
  }, [panel, editingOrganization, editingContact]);

  function runAction(action: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setNotice(result.message ?? "CRM actualizat.");
        setError("");
        setEditingOrganization(null);
        setEditingContact(null);
        setPanel(null);
        router.refresh();
      } else {
        setError(result.error ?? "Operațiunea CRM nu a putut fi salvată.");
        setNotice("");
      }
    });
  }

  function organizationSubmit(formData: FormData) {
    runAction(() => saveCrmOrganization(formData));
  }

  function contactSubmit(formData: FormData) {
    runAction(() => saveCrmContact(formData));
  }

  return (
    <div className="grid gap-6">
      {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
      {error ? <StatusNotice tone="warning">{error}</StatusNotice> : null}

      <div className="flex flex-col gap-3 border-b border-[rgb(var(--border))] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="grid gap-2 text-sm font-semibold">
            Caută
            <span className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[rgb(var(--muted-foreground))]" aria-hidden="true" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "contacts" ? "Nume, companie, email sau telefon" : "Companie, industrie sau oraș"} className="h-11 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] pl-10 pr-3" />
            </span>
          </label>
          {view !== "contacts" ? <label className="grid gap-2 text-sm font-semibold">Relație<select value={relationship} onChange={(event) => setRelationship(event.target.value)} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3"><option value="all">Toate</option><option value="prospect">Prospect</option><option value="customer">Client</option><option value="partner">Partener</option><option value="inactive">Inactiv</option></select></label> : <span />}
        </div>
        <div className="flex flex-wrap gap-2">
          {view !== "contacts" ? <Button className="gap-2" onClick={() => { setEditingOrganization(null); setPanel("organization"); }}><PlusIcon className="h-4 w-4" aria-hidden="true" />Adaugă companie</Button> : null}
          {view !== "companies" ? <Button className="gap-2" onClick={() => { setEditingContact(null); setPanel("contact"); }}><PlusIcon className="h-4 w-4" aria-hidden="true" />Adaugă contact</Button> : null}
        </div>
      </div>

      {view !== "contacts" && panel === "organization" ? <div className="fixed inset-0 z-50 flex justify-end bg-black/45" role="dialog" aria-modal="true" aria-label={editingOrganization ? "Editează compania" : "Adaugă companie"} onKeyDown={(event) => { if (event.key === "Escape") setPanel(null); }}>
        <button type="button" className="absolute inset-0" aria-label="Închide formularul" onClick={() => setPanel(null)} />
        <section ref={panelRef} className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-2xl">
        <div>
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-[rgb(var(--foreground))]">{editingOrganization ? "Editează compania" : "Adaugă companie"}</h2><button type="button" className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgb(var(--border))]" aria-label="Închide" onClick={() => setPanel(null)}><XMarkIcon className="h-5 w-5" /></button></div>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Companiile sunt clienți sau prospecți din workspace-ul curent.</p>
        </div>
        <form action={organizationSubmit} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={editingOrganization?.id ?? ""} />
          <label className="grid gap-2 text-sm font-semibold">
            Nume companie
            <input name="name" required defaultValue={editingOrganization?.name ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Website
            <input name="website" type="url" defaultValue={editingOrganization?.website ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Industrie
            <input name="industry" defaultValue={editingOrganization?.industry ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Telefon firmă
            <input name="phone" defaultValue={editingOrganization?.phone ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Oraș
            <input name="city" defaultValue={editingOrganization?.city ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Județ
            <input name="county" defaultValue={editingOrganization?.county ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Țară
            <input name="country" defaultValue={editingOrganization?.country ?? "România"} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Relație
            <select name="relationshipStatus" defaultValue={editingOrganization?.relationshipStatus ?? "prospect"} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3">
              <option value="prospect">Prospect</option>
              <option value="customer">Client</option>
              <option value="partner">Partener</option>
              <option value="inactive">Inactiv</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">
            Note
            <textarea name="notes" rows={3} defaultValue={editingOrganization?.notes ?? ""} className="resize-y rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2" />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={isPending}>{editingOrganization ? "Salvează compania" : "Creează compania"}</Button>
            {editingOrganization ? <Button variant="secondary" onClick={() => setEditingOrganization(null)}>Renunță</Button> : null}
          </div>
        </form>
      </section></div> : null}

      {view !== "companies" && panel === "contact" ? <div className="fixed inset-0 z-50 flex justify-end bg-black/45" role="dialog" aria-modal="true" aria-label={editingContact ? "Editează contactul" : "Adaugă contact"} onKeyDown={(event) => { if (event.key === "Escape") setPanel(null); }}>
        <button type="button" className="absolute inset-0" aria-label="Închide formularul" onClick={() => setPanel(null)} />
        <section ref={panelRef} className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-2xl">
        <div>
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-[rgb(var(--foreground))]">{editingContact ? "Editează contactul" : "Adaugă contact"}</h2><button type="button" className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgb(var(--border))]" aria-label="Închide" onClick={() => setPanel(null)}><XMarkIcon className="h-5 w-5" /></button></div>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Poți atașa mai multe contacte la aceeași companie și poți marca unul ca principal.</p>
        </div>
        <form action={contactSubmit} className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={editingContact?.id ?? ""} />
          <label className="grid gap-2 text-sm font-semibold">
            Companie
            <select name="organizationId" defaultValue={editingContact?.organizationId ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3">
              <option value="">Fără companie</option>
              {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Nume complet
            <input name="fullName" required defaultValue={editingContact?.fullName ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Prenume
            <input name="firstName" defaultValue={editingContact?.firstName ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Nume
            <input name="lastName" defaultValue={editingContact?.lastName ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Email
            <input name="email" type="email" defaultValue={editingContact?.email ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Telefon
            <input name="phone" defaultValue={editingContact?.phone ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Funcție
            <input name="jobTitle" defaultValue={editingContact?.jobTitle ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Departament
            <input name="department" defaultValue={editingContact?.department ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Rol decizie
            <select name="decisionRole" defaultValue={editingContact?.decisionRole ?? "other"} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3">
              {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Profil profesional
            <input name="professionalUrl" type="url" defaultValue={editingContact?.professionalUrl ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold md:col-span-2">
            <input name="isPrimaryForOrganization" type="checkbox" defaultChecked={Boolean(editingContact?.isPrimaryForOrganization)} className="size-4" />
            Contact principal pentru companie
          </label>
          <label className="grid gap-2 text-sm font-semibold md:col-span-2">
            Note
            <textarea name="notes" rows={3} defaultValue={editingContact?.notes ?? ""} className="resize-y rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2" />
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button type="submit" disabled={isPending}>{editingContact ? "Salvează contactul" : "Creează contactul"}</Button>
            {editingContact ? <Button variant="secondary" onClick={() => setEditingContact(null)}>Renunță</Button> : null}
          </div>
        </form>
      </section></div> : null}

      {view !== "contacts" ? <section className="grid gap-4">
        <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">Companii</h2>
        <div className="grid gap-3">
          {filteredOrganizations.map((organization) => {
            const organizationContacts = contacts.filter((contact) => contact.organizationId === organization.id);
            const primary = organizationContacts.find((contact) => contact.isPrimaryForOrganization);
            return (
              <article key={organization.id} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <a href={`/crm/organizations/${organization.id}`} className="break-words text-lg font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))]">{organization.name}</a>
                    <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{[organization.industry, organization.city, organization.county].filter(Boolean).join(" · ") || "Detalii necompletate"}</p>
                    <p className="mt-2 text-sm">Contact principal: <span className="font-semibold">{primary?.fullName ?? "Neconfirmat"}</span></p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => { setEditingOrganization(organization); setPanel("organization"); }}>Editează</Button>
                    <Button variant="ghost" onClick={() => runAction(() => archiveCrmOrganization(organization.id))}>Arhivează</Button>
                  </div>
                </div>
                <p className="mt-3 text-xs text-[rgb(var(--muted-foreground))]">{organizationContacts.length} contacte · {organizationStats[organization.id]?.activeOpportunities ?? 0} oportunități active · Ultima activitate {formatDate(organizationStats[organization.id]?.lastActivity ?? organization.updatedAt ?? undefined)}</p>
              </article>
            );
          })}
        </div>
        {organizations.length === 0 ? <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-[rgb(var(--border))] p-5 text-sm text-[rgb(var(--muted-foreground))]"><p>Nu există companii încă. Adaugă primul client sau prospect pentru a lega contacte și oportunități reale.</p><Button onClick={() => setPanel("organization")}>Adaugă companie</Button></div> : filteredOrganizations.length === 0 ? <p className="text-sm text-[rgb(var(--muted-foreground))]">Nicio companie nu corespunde filtrelor.</p> : null}
      </section> : null}

      {view !== "companies" ? <section className="grid gap-4">
        <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">Contacte</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {filteredContacts.map((contact) => (
            <article key={contact.id} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold text-[rgb(var(--foreground))]">{contact.fullName}</h3>
                  <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{[contact.jobTitle, contact.organization?.name].filter(Boolean).join(" · ") || "Rol neconfirmat"}</p>
                  {contact.isPrimaryForOrganization ? <p className="mt-2 text-xs font-semibold text-[rgb(var(--primary))]">Contact principal companie</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => { setEditingContact(contact); setPanel("contact"); }}>Editează</Button>
                  <Button variant="ghost" onClick={() => runAction(() => archiveCrmContact(contact.id))}>Arhivează</Button>
                </div>
              </div>
              <dl className="mt-3 grid gap-1 text-sm text-[rgb(var(--muted-foreground))]">
                <div className="flex justify-between gap-3"><dt>Email</dt><dd className="break-all text-right">{contact.email ?? "Necompletat"}</dd></div>
                <div className="flex justify-between gap-3"><dt>Telefon</dt><dd>{contact.phone ?? "Necompletat"}</dd></div>
              </dl>
            </article>
          ))}
        </div>
        {contacts.length === 0 ? <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-[rgb(var(--border))] p-5 text-sm text-[rgb(var(--muted-foreground))]"><p>Nu există contacte încă. Adaugă o persoană implicată sau documentează explicit că decidentul nu este cunoscut.</p><Button onClick={() => setPanel("contact")}>Adaugă contact</Button></div> : filteredContacts.length === 0 ? <p className="text-sm text-[rgb(var(--muted-foreground))]">Niciun contact nu corespunde căutării.</p> : null}
      </section> : null}
    </div>
  );
}
