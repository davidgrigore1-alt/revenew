"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import {
  removeOpportunityContact,
  saveOpportunityContact,
  setPrimaryOpportunityContact
} from "@/lib/crm/contact-actions";
import type { OpportunityContact } from "@/lib/types";
import { formatDateTimeWithSeconds } from "@/lib/utils";

type OpportunityContactsPanelProps = {
  opportunityId: string;
  contacts: OpportunityContact[];
  existingContacts?: Array<{ id: string; fullName: string; organizationName?: string | null; email?: string | null }>;
};

type EditableContact = {
  associationId: string;
  contactId: string;
  fullName: string;
  jobTitle: string;
  organizationName: string;
  email: string;
  phone: string;
  professionalUrl: string;
  role: string;
  notes: string;
  isPrimary: boolean;
};

const emptyEditableContact: EditableContact = {
  associationId: "",
  contactId: "",
  fullName: "",
  jobTitle: "",
  organizationName: "",
  email: "",
  phone: "",
  professionalUrl: "",
  role: "",
  notes: "",
  isPrimary: false
};

function editableFromContact(item: OpportunityContact): EditableContact {
  return {
    associationId: item.id,
    contactId: item.contactId,
    fullName: item.contact.fullName,
    jobTitle: item.contact.jobTitle ?? "",
    organizationName: item.contact.organization?.name ?? "",
    email: item.contact.email ?? "",
    phone: item.contact.phone ?? "",
    professionalUrl: item.contact.professionalUrl ?? "",
    role: item.role ?? "",
    notes: item.notes ?? item.contact.notes ?? "",
    isPrimary: item.isPrimary
  };
}

function ContactLine({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null;

  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-zinc-200">
        {href ? (
          <a href={href} className="text-mint-300 hover:text-mint-200">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

export function OpportunityContactsPanel({ opportunityId, contacts, existingContacts = [] }: OpportunityContactsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(contacts.length === 0);
  const [editing, setEditing] = useState<EditableContact>({ ...emptyEditableContact, isPrimary: contacts.length === 0 });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const primaryContact = useMemo(() => contacts.find((item) => item.isPrimary) ?? contacts[0] ?? null, [contacts]);
  const secondaryContacts = useMemo(
    () => contacts.filter((item) => item.id !== primaryContact?.id),
    [contacts, primaryContact?.id]
  );

  function resetForm() {
    setEditing({ ...emptyEditableContact, isPrimary: contacts.length === 0 });
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function editContact(item: OpportunityContact) {
    setEditing(editableFromContact(item));
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function refreshAfter(result: { ok: boolean; message?: string; error?: string }) {
    if (result.ok) {
      setMessage(result.message ?? "Contactele au fost actualizate.");
      setError("");
      setEditing({ ...emptyEditableContact, isPrimary: false });
      setShowForm(false);
      router.refresh();
      return;
    }

    setError(result.error ?? "Contactele nu au putut fi actualizate.");
    setMessage("");
  }

  function submitContact(formData: FormData) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await saveOpportunityContact(opportunityId, formData);
      refreshAfter(result);
    });
  }

  function submitExistingContact(formData: FormData) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await saveOpportunityContact(opportunityId, formData);
      refreshAfter(result);
    });
  }

  function setPrimary(associationId: string) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await setPrimaryOpportunityContact(opportunityId, associationId);
      refreshAfter(result);
    });
  }

  function removeContact(associationId: string) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await removeOpportunityContact(opportunityId, associationId);
      refreshAfter(result);
    });
  }

  function ContactCard({ item, featured = false }: { item: OpportunityContact; featured?: boolean }) {
    const professionalHref = item.contact.professionalUrl ?? undefined;
    const emailHref = item.contact.email ? `mailto:${item.contact.email}` : undefined;
    const phoneHref = item.contact.phone ? `tel:${item.contact.phone.replace(/\s+/g, "")}` : undefined;

    return (
      <article className={`rounded-lg border p-4 ${featured ? "border-mint-400/30 bg-mint-400/5" : "border-white/10 bg-ink-900/70"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-white">{item.contact.fullName}</h3>
              {item.isPrimary ? (
                <span className="rounded-lg border border-mint-400/25 bg-mint-400/10 px-2.5 py-1 text-xs font-semibold text-mint-300">
                  Principal
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {[item.contact.jobTitle, item.role, item.contact.organization?.name].filter(Boolean).join(" · ") || "Contact comercial"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!item.isPrimary ? (
              <button
                type="button"
                onClick={() => setPrimary(item.id)}
                disabled={isPending}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white disabled:opacity-60"
              >
                Setează principal
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => editContact(item)}
              disabled={isPending}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:text-white disabled:opacity-60"
            >
              Editează
            </button>
            <button
              type="button"
              onClick={() => removeContact(item.id)}
              disabled={isPending}
              className="rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold text-red-200 hover:text-red-100 disabled:opacity-60"
            >
              Elimină
            </button>
          </div>
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ContactLine label="Email" value={item.contact.email} href={emailHref} />
          <ContactLine label="Telefon" value={item.contact.phone} href={phoneHref} />
          <ContactLine label="Companie" value={item.contact.organization?.name} />
          <ContactLine label="Profil" value={item.contact.professionalUrl} href={professionalHref} />
        </dl>
        {item.notes || item.contact.notes ? (
          <p className="mt-4 rounded-lg border border-white/10 bg-ink-950/60 p-3 text-sm leading-6 text-zinc-300">
            {item.notes ?? item.contact.notes}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-zinc-500">
          Actualizat: {formatDateTimeWithSeconds(item.updatedAt ?? item.contact.updatedAt ?? item.createdAt ?? undefined)}
        </p>
      </article>
    );
  }

  return (
    <DataCard
      title="Contacte oportunitate"
      description="Gestionează persoanele și companiile implicate în această oportunitate."
      action={
        <button
          type="button"
          onClick={resetForm}
          className="rounded-lg border border-mint-400/25 bg-mint-400/10 px-4 py-2 text-sm font-semibold text-mint-300 hover:bg-mint-400/15"
        >
          Adaugă contact
        </button>
      }
    >
      <div className="space-y-4">
        {message ? <StatusNotice tone="success">{message}</StatusNotice> : null}
        {error ? <StatusNotice tone="warning">{error}</StatusNotice> : null}

        {primaryContact ? (
          <ContactCard item={primaryContact} featured />
        ) : (
          <EmptyState
            title="Nu există contact asociat"
            description="Adaugă persoana responsabilă, compania prospect și detaliile de contact înainte de outreach."
          />
        )}

        {secondaryContacts.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {secondaryContacts.map((item) => (
              <ContactCard key={item.id} item={item} />
            ))}
          </div>
        ) : null}

        {existingContacts.length > 0 ? (
          <form action={submitExistingContact} className="grid gap-3 rounded-lg border border-white/10 bg-ink-900/70 p-4 md:grid-cols-[1fr_auto]">
            <input type="hidden" name="useExistingContact" value="1" />
            <input type="hidden" name="associationId" value="" />
            <input type="hidden" name="fullName" value={existingContacts[0]?.fullName ?? ""} />
            <input type="hidden" name="organizationName" value="" />
            <label className="grid gap-2 text-sm font-semibold text-zinc-200">
              Asociază un contact existent
              <select
                name="contactId"
                className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none focus:border-mint-400/50"
                onChange={(event) => {
                  const selected = existingContacts.find((contact) => contact.id === event.currentTarget.value);
                  const form = event.currentTarget.form;
                  if (form && selected) {
                    (form.elements.namedItem("fullName") as HTMLInputElement).value = selected.fullName;
                    (form.elements.namedItem("organizationName") as HTMLInputElement).value = selected.organizationName ?? "";
                  }
                }}
              >
                {existingContacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>{[contact.fullName, contact.organizationName, contact.email].filter(Boolean).join(" · ")}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-zinc-200">
              Rol
              <select name="role" defaultValue="decision_maker" className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none focus:border-mint-400/50">
                <option value="decision_maker">Decident</option><option value="economic_buyer">Cumpărător economic</option><option value="champion">Champion intern</option><option value="influencer">Influencer</option><option value="approver">Aprobator</option><option value="other">Alt rol</option>
              </select>
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-zinc-200 md:col-span-2">
              <input name="isPrimary" type="checkbox" defaultChecked={contacts.length === 0} className="size-4 rounded border-white/20 bg-ink-950 text-mint-400" />
              Contact principal pentru această oportunitate
            </label>
            <div className="md:col-span-2">
              <button type="submit" disabled={isPending} className="rounded-lg bg-mint-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-mint-400 disabled:opacity-60">
                Asociază contactul
              </button>
            </div>
          </form>
        ) : null}

        {showForm ? (
          <form action={submitContact} className="grid gap-4 rounded-lg border border-white/10 bg-ink-900/70 p-4">
            <input type="hidden" name="associationId" value={editing.associationId} />
            <input type="hidden" name="contactId" value={editing.contactId} />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-zinc-200">
                Nume contact
                <input
                  name="fullName"
                  required
                  defaultValue={editing.fullName}
                  className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none focus:border-mint-400/50"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-200">
                Rol în companie
                <input
                  name="jobTitle"
                  defaultValue={editing.jobTitle}
                  className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none focus:border-mint-400/50"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-200">
                Companie prospect
                <input
                  name="organizationName"
                  defaultValue={editing.organizationName}
                  className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none focus:border-mint-400/50"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-200">
                Rol în oportunitate
                <select
                  name="role"
                  defaultValue={editing.role}
                  className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none focus:border-mint-400/50"
                >
                  {editing.role && !["decision_maker", "economic_buyer", "champion", "influencer", "approver", "other"].includes(editing.role) ? <option value={editing.role}>Rol legacy: {editing.role}</option> : null}
                  <option value="decision_maker">Decident</option><option value="economic_buyer">Cumpărător economic</option><option value="champion">Champion intern</option><option value="influencer">Influencer</option><option value="approver">Aprobator</option><option value="other">Alt rol</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-200">
                Email
                <input
                  name="email"
                  type="email"
                  defaultValue={editing.email}
                  className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none focus:border-mint-400/50"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-200">
                Telefon
                <input
                  name="phone"
                  defaultValue={editing.phone}
                  placeholder="+407..."
                  className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none focus:border-mint-400/50"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-200 md:col-span-2">
                Profil profesional
                <input
                  name="professionalUrl"
                  type="url"
                  defaultValue={editing.professionalUrl}
                  placeholder="https://www.linkedin.com/in/..."
                  className="h-11 rounded-lg border border-white/10 bg-ink-950/80 px-4 text-white outline-none focus:border-mint-400/50"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-zinc-200 md:col-span-2">
                Note
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={editing.notes}
                  className="rounded-lg border border-white/10 bg-ink-950/80 px-4 py-3 text-white outline-none focus:border-mint-400/50"
                />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold text-zinc-200">
              <input
                name="isPrimary"
                type="checkbox"
                defaultChecked={editing.isPrimary || contacts.length === 0}
                className="size-4 rounded border-white/20 bg-ink-950 text-mint-400"
              />
              Contact principal pentru această oportunitate
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-mint-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-mint-400 disabled:opacity-60"
              >
                {isPending ? "Se salvează..." : editing.associationId ? "Salvează modificările" : "Salvează contact"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={isPending}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200 hover:text-white disabled:opacity-60"
              >
                Închide
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </DataCard>
  );
}
