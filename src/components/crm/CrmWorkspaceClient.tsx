"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BuildingOffice2Icon, EnvelopeIcon, MagnifyingGlassIcon, PhoneIcon, PlusIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/outline";
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
              <article key={organization.id} className="grid gap-4 rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)_auto] lg:items-center">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-[rgb(var(--brand-100))] text-[rgb(var(--brand-800))] dark:bg-[rgb(var(--surface-muted))] dark:text-[rgb(var(--brand-300))]"><BuildingOffice2Icon className="h-5 w-5" aria-hidden="true" /></span>
                  <div className="min-w-0"><a href={`/crm/organizations/${organization.id}`} className="break-words font-semibold text-[rgb(var(--foreground))] hover:text-[rgb(var(--primary))]">{organization.name}</a>
                  <p className="mt-1 text-xs text-[rgb(var(--muted-foreground))]">{[organization.industry, organization.city, organization.county].filter(Boolean).join(" · ") || "Detalii necompletate"}</p></div>
                </div>
                <div className="grid gap-1.5 text-xs text-[rgb(var(--text-muted))] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <p><span className="text-[rgb(var(--text-faint))]">Contact</span><br /><strong className="font-semibold text-[rgb(var(--foreground))]">{primary?.fullName ?? "Neconfirmat"}</strong></p>
                  <p><span className="text-[rgb(var(--text-faint))]">Activitate</span><br /><strong className="font-semibold text-[rgb(var(--foreground))]">{formatDate(organizationStats[organization.id]?.lastActivity ?? organization.updatedAt ?? undefined)}</strong></p>
                  <p className="sm:col-span-2 lg:col-span-1 xl:col-span-2">{organizationContacts.length} contacte · {organizationStats[organization.id]?.activeOpportunities ?? 0} oportunități active</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Button variant="secondary" onClick={() => { setEditingOrganization(organization); setPanel("organization"); }}>Editează</Button>
                    <Button variant="ghost" onClick={() => runAction(() => archiveCrmOrganization(organization.id))}>Arhivează</Button>
                </div>
              </article>
            );
          })}
        </div>
        {organizations.length === 0 ? <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-[rgb(var(--border))] p-5 text-sm text-[rgb(var(--muted-foreground))]"><p>Nu există companii încă. Adaugă primul client sau prospect pentru a lega contacte și oportunități reale.</p><Button onClick={() => setPanel("organization")}>Adaugă companie</Button></div> : filteredOrganizations.length === 0 ? <p className="text-sm text-[rgb(var(--muted-foreground))]">Nicio companie nu corespunde filtrelor.</p> : null}
      </section> : null}

      {view !== "companies" ? <section className="grid gap-4">
        <h2 className="text-base font-semibold text-[rgb(var(--foreground))]">Contacte</h2>
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredContacts.map((contact) => (
            <article key={contact.id} className="flex min-h-full flex-col rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-4 shadow-card">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--surface-muted))] text-[rgb(var(--text-secondary))]"><UserIcon className="h-5 w-5" aria-hidden="true" /></span>
                <div className="min-w-0"><h3 className="break-words font-semibold text-[rgb(var(--foreground))]">{contact.fullName}</h3>
                <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">{[contact.jobTitle, contact.organization?.name].filter(Boolean).join(" · ") || "Rol neconfirmat"}</p>
                {contact.isPrimaryForOrganization ? <p className="mt-1.5 text-xs font-semibold text-[rgb(var(--primary))]">Contact principal</p> : null}</div>
              </div>
              <dl className="mt-4 grid gap-2 border-t border-[rgb(var(--border))] pt-3 text-sm text-[rgb(var(--muted-foreground))] sm:grid-cols-2">
                <div className="flex min-w-0 items-center gap-2"><EnvelopeIcon className="h-4 w-4 shrink-0" aria-hidden="true" /><dt className="sr-only">Email</dt><dd className="truncate">{contact.email ?? "Email necompletat"}</dd></div>
                <div className="flex min-w-0 items-center gap-2"><PhoneIcon className="h-4 w-4 shrink-0" aria-hidden="true" /><dt className="sr-only">Telefon</dt><dd>{contact.phone ?? "Telefon necompletat"}</dd></div>
              </dl>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                  <Button variant="secondary" onClick={() => { setEditingContact(contact); setPanel("contact"); }}>Editează</Button>
                  <Button variant="ghost" onClick={() => runAction(() => archiveCrmContact(contact.id))}>Arhivează</Button>
              </div>
            </article>
          ))}
        </div>
        {contacts.length === 0 ? <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-[rgb(var(--border))] p-5 text-sm text-[rgb(var(--muted-foreground))]"><p>Nu există contacte încă. Adaugă o persoană implicată sau documentează explicit că decidentul nu este cunoscut.</p><Button onClick={() => setPanel("contact")}>Adaugă contact</Button></div> : filteredContacts.length === 0 ? <p className="text-sm text-[rgb(var(--muted-foreground))]">Niciun contact nu corespunde căutării.</p> : null}
      </section> : null}
    </div>
  );
}
