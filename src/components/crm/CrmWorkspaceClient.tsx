"use client";

import { Select } from "@/components/ui/Select";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { ArchiveBoxIcon, MagnifyingGlassIcon, PencilSquareIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/Button";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { SavedViewControls } from "@/components/filters/SavedViewControls";
import { archiveCrmContact, archiveCrmOrganization, saveCrmContact, saveCrmOrganization } from "@/lib/crm/workspace-actions";
import { normalizeOptionalCompanyWebsite } from "@/lib/crm/website";
import type { CrmContact, CrmOrganization } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type CrmWorkspaceClientProps = {
  organizations: CrmOrganization[];
  contacts: CrmContact[];
  view?: "all" | "companies" | "contacts";
  organizationStats?: Record<string, { activeOpportunities: number; lastActivity?: string }>;
  savedViews?: Array<{ id: string; name: string; filter_state: Record<string, string> | null }>;
  initialQuery?: string;
  initialRelationship?: string;
  initialSort?: string;
  initialCreate?: boolean;
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

const roleLabels = Object.fromEntries(roleOptions) as Record<string, string>;
const relationshipLabels: Record<string, string> = { prospect: "Prospect", customer: "Client", partner: "Partener", inactive: "Inactiv" };

export function CrmWorkspaceClient({ organizations, contacts, view = "all", organizationStats = {}, savedViews = [], initialQuery = "", initialRelationship = "all", initialSort = "updated", initialCreate = false }: CrmWorkspaceClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editingOrganization, setEditingOrganization] = useState<CrmOrganization | null>(null);
  const [editingContact, setEditingContact] = useState<CrmContact | null>(null);
  const [panel, setPanel] = useState<"organization" | "contact" | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [relationship, setRelationship] = useState(initialRelationship);
  const [sort, setSort] = useState(initialSort);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [websiteError, setWebsiteError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("ro-RO");
  const filteredOrganizations = useMemo(() => organizations.filter((organization) => {
    const matchesQuery = !normalizedQuery || `${organization.name} ${organization.industry ?? ""} ${organization.city ?? ""}`.toLocaleLowerCase("ro-RO").includes(normalizedQuery);
    return matchesQuery && (relationship === "all" || organization.relationshipStatus === relationship);
  }), [organizations, normalizedQuery, relationship]);
  const filteredContacts = useMemo(() => contacts.filter((contact) => !normalizedQuery || `${contact.fullName} ${contact.email ?? ""} ${contact.phone ?? ""} ${contact.jobTitle ?? ""} ${contact.organization?.name ?? ""}`.toLocaleLowerCase("ro-RO").includes(normalizedQuery)), [contacts, normalizedQuery]);
  const sortedOrganizations = useMemo(() => [...filteredOrganizations].sort((left, right) => {
    if (sort === "name") return left.name.localeCompare(right.name, "ro");
    if (sort === "opportunities") return (organizationStats[right.id]?.activeOpportunities ?? 0) - (organizationStats[left.id]?.activeOpportunities ?? 0);
    return String(organizationStats[right.id]?.lastActivity ?? right.updatedAt ?? "").localeCompare(String(organizationStats[left.id]?.lastActivity ?? left.updatedAt ?? ""));
  }), [filteredOrganizations, organizationStats, sort]);
  const sortedContacts = useMemo(() => [...filteredContacts].sort((left, right) => {
    if (sort === "company") return String(left.organization?.name ?? "").localeCompare(String(right.organization?.name ?? ""), "ro");
    if (sort === "updated") return String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? ""));
    return left.fullName.localeCompare(right.fullName, "ro");
  }), [filteredContacts, sort]);
  const currentQuery = new URLSearchParams(Object.entries({
    q: query.trim(),
    relationship: view === "contacts" || relationship === "all" ? "" : relationship,
    sort
  }).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString();
  const visibleIds = view === "contacts" ? sortedContacts.map((item) => item.id) : sortedOrganizations.map((item) => item.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  useEffect(() => {
    if (initialCreate) setPanel(view === "contacts" ? "contact" : "organization");
  }, [initialCreate, view]);

  useEffect(() => {
    if (!panel) return;
    panelRef.current?.querySelector<HTMLElement>("input:not([type='hidden']), select, textarea")?.focus();
    if (panel === "organization") setWebsiteError("");
  }, [panel, editingOrganization, editingContact]);

  function validateWebsiteField() {
    const input = websiteRef.current;
    if (!input) return true;
    const result = normalizeOptionalCompanyWebsite(input.value);
    if (!result.ok) {
      setWebsiteError(result.error);
      input.focus();
      return false;
    }
    input.value = result.value ?? "";
    setWebsiteError("");
    return true;
  }

  function organizationFormSubmit(event: FormEvent<HTMLFormElement>) {
    if (!validateWebsiteField()) event.preventDefault();
  }

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
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "contacts" ? "Nume, companie, email sau telefon" : "Companie, industrie sau oraș"} className="focus-ring h-10 w-full rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] pl-10 pr-3 text-sm shadow-sm transition-colors hover:border-[rgb(var(--border-strong))]" />
            </span>
          </label>
          {view !== "contacts" ? <label className="grid gap-2 text-sm font-semibold">Relație<Select value={relationship} onChange={(event) => setRelationship(event.target.value)} className="focus-ring h-10 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 text-sm shadow-sm transition-colors hover:border-[rgb(var(--border-strong))]"><option value="all">Toate</option><option value="prospect">Prospect</option><option value="customer">Client</option><option value="partner">Partener</option><option value="inactive">Inactiv</option></Select></label> : <span />}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-xs font-semibold text-[rgb(var(--text-secondary))]">Sortare<Select value={sort} onChange={(event) => setSort(event.target.value)} className="focus-ring h-9 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-2.5 text-xs font-medium"><option value="updated">Actualizare recentă</option><option value="name">Nume</option>{view !== "contacts" ? <option value="opportunities">Oportunități active</option> : <option value="company">Companie</option>}</Select></label>
          {view !== "contacts" ? <Button className="gap-2" onClick={() => { setEditingOrganization(null); setPanel("organization"); }}><PlusIcon className="h-4 w-4" aria-hidden="true" />Adaugă companie</Button> : null}
          {view !== "companies" ? <Button className="gap-2" onClick={() => { setEditingContact(null); setPanel("contact"); }}><PlusIcon className="h-4 w-4" aria-hidden="true" />Adaugă contact</Button> : null}
        </div>
      </div>

      <SavedViewControls views={savedViews} currentQuery={currentQuery} targetPage={view === "contacts" ? "contacts" : "companies"} />

      {selectedIds.size > 0 ? <div role="toolbar" aria-label="Acțiuni pentru selecție" className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 product-floating-surface px-3 py-2"><p className="text-xs font-semibold"><span className="tabular-nums text-[rgb(var(--primary))]">{selectedIds.size}</span> selectate</p><div className="flex flex-wrap gap-2"><Button href="/ai" variant="secondary" size="small">Deschide Ask ReveNew</Button><Button type="button" variant="ghost" size="small" onClick={() => setSelectedIds(new Set())}>Șterge selecția</Button></div></div> : null}

      {view !== "contacts" && panel === "organization" ? <div className="fixed inset-0 z-50 flex justify-end bg-black/45" role="dialog" aria-modal="true" aria-label={editingOrganization ? "Editează compania" : "Adaugă companie"} onKeyDown={(event) => { if (event.key === "Escape") setPanel(null); }}>
        <button type="button" className="absolute inset-0" aria-label="Închide formularul" onClick={() => setPanel(null)} />
        <section ref={panelRef} className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-[rgb(var(--border))] bg-[rgb(var(--surface))] p-5 shadow-2xl">
        <div>
          <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-[rgb(var(--foreground))]">{editingOrganization ? "Editează compania" : "Adaugă companie"}</h2><button type="button" className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[rgb(var(--border))]" aria-label="Închide" onClick={() => setPanel(null)}><XMarkIcon className="h-5 w-5" /></button></div>
          <p className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">Companiile sunt clienți sau prospecți din spațiul de lucru curent.</p>
        </div>
        <form action={organizationSubmit} onSubmit={organizationFormSubmit} noValidate className="grid gap-3 md:grid-cols-2">
          <input type="hidden" name="id" value={editingOrganization?.id ?? ""} />
          {error ? <p role="alert" className="md:col-span-2 rounded-lg border border-[rgb(var(--danger-border))] bg-[rgb(var(--danger-background))] px-3 py-2 text-sm text-[rgb(var(--danger-text))]">{error}</p> : null}
          <label className="grid gap-2 text-sm font-semibold">
            Nume companie
            <input name="name" required defaultValue={editingOrganization?.name ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            Website / Domeniu <span className="font-normal text-[rgb(var(--text-muted))]">(opțional)</span>
            <input
              ref={websiteRef}
              key={editingOrganization?.id ?? "new-organization-website"}
              name="website"
              type="text"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              defaultValue={editingOrganization?.website ?? ""}
              onBlur={validateWebsiteField}
              onChange={() => { if (websiteError) setWebsiteError(""); }}
              aria-invalid={Boolean(websiteError)}
              aria-describedby="company-website-help company-website-error"
              className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3"
            />
            <span id="company-website-help" className="text-xs font-normal leading-5 text-[rgb(var(--text-muted))]">Website-ul este opțional. Poți introduce direct domeniul companiei.</span>
            {websiteError ? <span id="company-website-error" role="alert" className="text-xs font-normal leading-5 text-[rgb(var(--danger-text))]">{websiteError}</span> : null}
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
            <Select name="relationshipStatus" defaultValue={editingOrganization?.relationshipStatus ?? "prospect"} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3">
              <option value="prospect">Prospect</option>
              <option value="customer">Client</option>
              <option value="partner">Partener</option>
              <option value="inactive">Inactiv</option>
            </Select>
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
            <Select name="organizationId" defaultValue={editingContact?.organizationId ?? ""} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3">
              <option value="">Fără companie</option>
              {organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}
            </Select>
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
            <Select name="decisionRole" defaultValue={editingContact?.decisionRole ?? "other"} className="h-11 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3">
              {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
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

      {view !== "contacts" ? <section>
        <div className="flex items-center justify-between gap-4 border-b border-[rgb(var(--border))] pb-3">
          <p className="text-sm font-semibold">{filteredOrganizations.length} companii</p>
          <p className="hidden text-xs text-[rgb(var(--text-muted))] sm:block">Deschide o înregistrare pentru memorie, activitate și oportunități.</p>
        </div>
        <div className="overflow-x-auto border-y border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))]" role="region" aria-label="Registru companii" tabIndex={0}>
          <table className="w-full min-w-[900px] table-fixed border-collapse text-left text-sm">
            <caption className="sr-only">Companiile accesibile în spațiul de lucru curent</caption>
            <thead className="bg-[rgb(var(--surface-subtle))] text-[0.6875rem] font-semibold text-[rgb(var(--text-secondary))]">
              <tr className="border-b border-[rgb(var(--border-strong))]">
                <th scope="col" className="w-[27%] px-3 py-2.5"><span className="flex items-center gap-2"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleIds))} aria-label="Selectează companiile vizibile" className="size-4" />Companie</span></th>
                <th scope="col" className="w-[12%] px-3 py-2.5">Relație</th>
                <th scope="col" className="w-[22%] px-3 py-2.5">Contact principal</th>
                <th scope="col" className="w-[12%] px-3 py-2.5">Oportunități</th>
                <th scope="col" className="w-[17%] px-3 py-2.5">Ultima activitate</th>
                <th scope="col" className="w-[10%] px-3 py-2.5 text-right"><span className="sr-only">Acțiuni</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {sortedOrganizations.map((organization) => {
                const organizationContacts = contacts.filter((contact) => contact.organizationId === organization.id);
                const primary = organizationContacts.find((contact) => contact.isPrimaryForOrganization);
                return (
                  <tr key={organization.id} className="group transition-colors hover:bg-[rgb(var(--surface-elevated))] focus-within:bg-[rgb(var(--surface-elevated))]">
                    <td className="border-l-2 border-l-transparent px-3 py-2.5 align-middle group-hover:border-l-[rgb(var(--primary))] group-focus-within:border-l-[rgb(var(--primary))]">
                      <div className="flex min-w-0 items-start gap-2"><input type="checkbox" checked={selectedIds.has(organization.id)} onChange={() => setSelectedIds((current) => { const next = new Set(current); if (next.has(organization.id)) next.delete(organization.id); else next.add(organization.id); return next; })} aria-label={"Selectează compania " + organization.name} className="mt-0.5 size-4 shrink-0" />
                      <Link href={`/crm/organizations/${organization.id}`} className="focus-ring block min-w-0 flex-1 rounded-control">
                        <span className="block truncate font-semibold text-[rgb(var(--foreground))] decoration-[rgb(var(--primary))] underline-offset-4 group-hover:text-[rgb(var(--primary))] group-hover:underline">{organization.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-[rgb(var(--text-faint))]">{[organization.industry, organization.city].filter(Boolean).join(" · ") || "Context necompletat"}</span>
                      </Link></div>
                    </td>
                    <td className="px-3 py-2.5"><span className={"status-pill " + (organization.relationshipStatus === "inactive" ? "status-pill-neutral" : organization.relationshipStatus === "customer" ? "status-pill-success" : "status-pill-brand")}>{relationshipLabels[organization.relationshipStatus ?? "prospect"] ?? "Neclasificată"}</span></td>
                    <td className="px-3 py-2.5"><p className="truncate font-medium text-[rgb(var(--foreground))]">{primary?.fullName ?? "Neconfirmat"}</p><p className="mt-0.5 truncate text-xs text-[rgb(var(--text-faint))]">{primary?.jobTitle ?? (organizationContacts.length ? organizationContacts.length + " contacte" : "Fără contact")}</p></td>
                    <td className="px-3 py-2.5 font-semibold tabular-nums text-[rgb(var(--foreground))]">{organizationStats[organization.id]?.activeOpportunities ?? 0}</td>
                    <td className="px-3 py-2.5 text-xs text-[rgb(var(--text-muted))]">{formatDate(organizationStats[organization.id]?.lastActivity ?? organization.updatedAt ?? undefined)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-end gap-0.5 text-[rgb(var(--text-faint))] opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <button type="button" className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-control hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))]" aria-label={`Editează compania ${organization.name}`} title="Editează" onClick={() => { setEditingOrganization(organization); setPanel("organization"); }}><PencilSquareIcon className="h-4 w-4" aria-hidden="true" /></button>
                        <button type="button" className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-control hover:bg-[rgb(var(--danger-background))] hover:text-[rgb(var(--danger-text))]" aria-label={`Arhivează compania ${organization.name}`} title="Arhivează" disabled={isPending} onClick={() => runAction(() => archiveCrmOrganization(organization.id))}><ArchiveBoxIcon className="h-4 w-4" aria-hidden="true" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {organizations.length === 0 ? <div className="grid justify-items-start gap-3 border-y border-dashed border-[rgb(var(--border))] py-8 text-sm text-[rgb(var(--muted-foreground))]"><p>Nu există companii încă. Adaugă primul client sau prospect pentru a lega contacte și oportunități reale.</p><Button onClick={() => setPanel("organization")}>Adaugă companie</Button></div> : filteredOrganizations.length === 0 ? <p className="border-b border-[rgb(var(--border))] py-8 text-sm text-[rgb(var(--muted-foreground))]">Nicio companie nu corespunde filtrelor.</p> : null}
      </section> : null}

      {view !== "companies" ? <section className="grid gap-3">
        <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold text-[rgb(var(--foreground))]">Contacte</h2><p className="text-xs text-[rgb(var(--text-muted))]">{filteredContacts.length} înregistrări</p></div>
        <div className="overflow-x-auto border-y border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))]" role="region" aria-label="Registru contacte" tabIndex={0}>
          <table className="w-full min-w-[940px] table-fixed border-collapse text-left text-sm">
            <caption className="sr-only">Contactele comerciale accesibile în spațiul de lucru curent</caption>
            <thead className="bg-[rgb(var(--surface-subtle))] text-[0.6875rem] font-semibold text-[rgb(var(--text-secondary))]">
              <tr className="border-b border-[rgb(var(--border-strong))]">
                <th scope="col" className="w-[23%] px-3 py-2.5"><span className="flex items-center gap-2"><input type="checkbox" checked={allVisibleSelected} onChange={() => setSelectedIds(allVisibleSelected ? new Set() : new Set(visibleIds))} aria-label="Selectează contactele vizibile" className="size-4" />Persoană</span></th>
                <th scope="col" className="w-[19%] px-3 py-2.5">Companie</th>
                <th scope="col" className="w-[13%] px-3 py-2.5">Rol</th>
                <th scope="col" className="w-[25%] px-3 py-2.5">Contact</th>
                <th scope="col" className="w-[11%] px-3 py-2.5">Statut</th>
                <th scope="col" className="w-[9%] px-3 py-2.5 text-right"><span className="sr-only">Acțiuni</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgb(var(--border))]">
              {sortedContacts.map((contact) => (
                <tr key={contact.id} className="group transition-colors hover:bg-[rgb(var(--surface-elevated))] focus-within:bg-[rgb(var(--surface-elevated))]">
                  <td className="border-l-2 border-l-transparent px-3 py-2.5 align-middle group-hover:border-l-[rgb(var(--primary))] group-focus-within:border-l-[rgb(var(--primary))]">
                    <div className="flex min-w-0 items-start gap-2"><input type="checkbox" checked={selectedIds.has(contact.id)} onChange={() => setSelectedIds((current) => { const next = new Set(current); if (next.has(contact.id)) next.delete(contact.id); else next.add(contact.id); return next; })} aria-label={"Selectează contactul " + contact.fullName} className="mt-0.5 size-4 shrink-0" />
                    <Link href={"/crm/contacts/" + contact.id} className="focus-ring block w-full min-w-0 flex-1 rounded-control text-left" aria-label={"Deschide contactul " + contact.fullName}>
                      <span className="block truncate font-semibold text-[rgb(var(--foreground))] decoration-[rgb(var(--primary))] underline-offset-4 group-hover:text-[rgb(var(--primary))] group-hover:underline">{contact.fullName}</span>
                      <span className="mt-0.5 block truncate text-xs text-[rgb(var(--text-faint))]">{contact.jobTitle ?? "Funcție neconfirmată"}</span>
                    </Link></div>
                  </td>
                  <td className="px-3 py-2.5">{contact.organizationId && contact.organization ? <Link href={`/crm/organizations/${contact.organizationId}?tab=contacts`} className="focus-ring block truncate rounded-control text-[rgb(var(--text-secondary))] decoration-[rgb(var(--primary))] underline-offset-4 hover:text-[rgb(var(--primary))] hover:underline">{contact.organization.name}</Link> : <span className="text-[rgb(var(--text-muted))]">Fără companie</span>}</td>
                  <td className="px-3 py-2.5 text-xs font-medium text-[rgb(var(--text-secondary))]">{roleLabels[contact.decisionRole ?? "other"] ?? "Neconfirmat"}</td>
                  <td className="px-3 py-2.5"><p className="truncate text-xs text-[rgb(var(--foreground))]">{contact.email ?? "Email necompletat"}</p><p className="mt-0.5 truncate text-xs text-[rgb(var(--text-faint))]">{contact.phone ?? "Telefon necompletat"}</p></td>
                  <td className="px-3 py-2.5"><span className={contact.isPrimaryForOrganization ? "status-pill status-pill-success" : "status-pill status-pill-neutral"}>{contact.isPrimaryForOrganization ? "Principal" : "Secundar"}</span></td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-0.5 text-[rgb(var(--text-faint))] opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                      <button type="button" className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-control hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))]" aria-label={`Editează contactul ${contact.fullName}`} title="Editează" onClick={() => { setEditingContact(contact); setPanel("contact"); }}><PencilSquareIcon className="h-4 w-4" aria-hidden="true" /></button>
                      <button type="button" className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-control hover:bg-[rgb(var(--danger-background))] hover:text-[rgb(var(--danger-text))]" aria-label={`Arhivează contactul ${contact.fullName}`} title="Arhivează" disabled={isPending} onClick={() => runAction(() => archiveCrmContact(contact.id))}><ArchiveBoxIcon className="h-4 w-4" aria-hidden="true" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {contacts.length === 0 ? <div className="grid justify-items-start gap-3 rounded-lg border border-dashed border-[rgb(var(--border))] p-5 text-sm text-[rgb(var(--muted-foreground))]"><p>Nu există contacte încă. Adaugă o persoană implicată sau documentează explicit că decidentul nu este cunoscut.</p><Button onClick={() => setPanel("contact")}>Adaugă contact</Button></div> : filteredContacts.length === 0 ? <p className="text-sm text-[rgb(var(--muted-foreground))]">Niciun contact nu corespunde căutării.</p> : null}
      </section> : null}
    </div>
  );
}
