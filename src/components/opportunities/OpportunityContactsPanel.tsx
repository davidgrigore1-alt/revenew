"use client";

import { Select } from "@/components/ui/Select";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DataCard } from "@/components/dashboard/DataCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { useToast } from "@/components/ui/ToastProvider";
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
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-faint))]">{label}</dt>
      <dd className="mt-1 break-words text-sm text-[rgb(var(--text-secondary))]">
        {href ? (
          <a href={href} className="focus-ring rounded-button text-[rgb(var(--primary))] hover:underline">
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
  const { showToast } = useToast();
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
      showToast({ title: result.message ?? "Contactele au fost actualizate.", tone: "success" });
      setError("");
      setEditing({ ...emptyEditableContact, isPrimary: false });
      setShowForm(false);
      router.refresh();
      return;
    }

    setError(result.error ?? "Contactele nu au putut fi actualizate.");
    showToast({ title: "Contactele nu au fost actualizate", description: result.error ?? "Verifică datele și încearcă din nou.", tone: "danger" });
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
      <article className={`rounded-card border p-4 ${featured ? "border-[rgb(var(--border-strong))] border-l-2 border-l-[rgb(var(--primary))] bg-[rgb(var(--surface-subtle))]" : "border-[rgb(var(--border))] bg-[rgb(var(--surface))]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-[rgb(var(--foreground))]">{item.contact.fullName}</h3>
              {item.isPrimary ? (
                <span className="status-pill status-pill-success">
                  Principal
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-[rgb(var(--text-muted))]">
              {[item.contact.jobTitle, item.role, item.contact.organization?.name].filter(Boolean).join(" · ") || "Contact comercial"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!item.isPrimary ? (
              <button
                type="button"
                onClick={() => setPrimary(item.id)}
                disabled={isPending}
                className="focus-ring rounded-control border border-[rgb(var(--border))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] transition-colors hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))] disabled:opacity-60"
              >
                Setează principal
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => editContact(item)}
              disabled={isPending}
              className="focus-ring rounded-control border border-[rgb(var(--border))] px-3 py-2 text-xs font-semibold text-[rgb(var(--text-secondary))] transition-colors hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))] disabled:opacity-60"
            >
              Editează
            </button>
            <button
              type="button"
              onClick={() => removeContact(item.id)}
              disabled={isPending}
              className="focus-ring rounded-control border border-[rgb(var(--danger-border))] px-3 py-2 text-xs font-semibold text-[rgb(var(--danger-text))] transition-colors hover:bg-[rgb(var(--danger-background))] disabled:opacity-60"
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
          <p className="mt-4 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))] p-3 text-sm leading-6 text-[rgb(var(--text-secondary))]">
            {item.notes ?? item.contact.notes}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-[rgb(var(--text-faint))]">
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
          className="focus-ring rounded-control bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))] transition-colors hover:bg-[rgb(var(--primary-hover))]"
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
          <form action={submitExistingContact} className="grid gap-3 rounded-card border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] p-4 md:grid-cols-[1fr_auto]">
            <input type="hidden" name="useExistingContact" value="1" />
            <input type="hidden" name="associationId" value="" />
            <input type="hidden" name="fullName" value={existingContacts[0]?.fullName ?? ""} />
            <input type="hidden" name="organizationName" value="" />
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
              Asociază un contact existent
              <Select
                name="contactId"
                className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]"
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
              </Select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
              Rol
              <Select name="role" defaultValue="decision_maker" className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]">
                <option value="decision_maker">Decident</option><option value="economic_buyer">Cumpărător economic</option><option value="champion">Champion intern</option><option value="influencer">Influencer</option><option value="approver">Aprobator</option><option value="other">Alt rol</option>
              </Select>
            </label>
            <label className="flex items-center gap-3 text-sm font-semibold text-[rgb(var(--foreground))] md:col-span-2">
              <input name="isPrimary" type="checkbox" defaultChecked={contacts.length === 0} className="focus-ring size-4 rounded border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] text-[rgb(var(--primary))]" />
              Contact principal pentru această oportunitate
            </label>
            <div className="md:col-span-2">
              <button type="submit" disabled={isPending} className="focus-ring rounded-control bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))] transition-colors hover:bg-[rgb(var(--primary-hover))] disabled:opacity-60">
                Asociază contactul
              </button>
            </div>
          </form>
        ) : null}

        {showForm ? (
          <form action={submitContact} className="grid gap-4 rounded-card border border-[rgb(var(--border-strong))] bg-[rgb(var(--surface-subtle))] p-4">
            <input type="hidden" name="associationId" value={editing.associationId} />
            <input type="hidden" name="contactId" value={editing.contactId} />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                Nume contact
                <input
                  name="fullName"
                  required
                  defaultValue={editing.fullName}
                  className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                Rol în companie
                <input
                  name="jobTitle"
                  defaultValue={editing.jobTitle}
                  className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                Companie prospect
                <input
                  name="organizationName"
                  defaultValue={editing.organizationName}
                  className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                Rol în oportunitate
                <Select
                  name="role"
                  defaultValue={editing.role}
                  className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]"
                >
                  {editing.role && !["decision_maker", "economic_buyer", "champion", "influencer", "approver", "other"].includes(editing.role) ? <option value={editing.role}>Rol legacy: {editing.role}</option> : null}
                  <option value="decision_maker">Decident</option><option value="economic_buyer">Cumpărător economic</option><option value="champion">Champion intern</option><option value="influencer">Influencer</option><option value="approver">Aprobator</option><option value="other">Alt rol</option>
                </Select>
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                Email
                <input
                  name="email"
                  type="email"
                  defaultValue={editing.email}
                  className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))]">
                Telefon
                <input
                  name="phone"
                  defaultValue={editing.phone}
                  placeholder="+407..."
                  className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))] md:col-span-2">
                Profil profesional
                <input
                  name="professionalUrl"
                  type="url"
                  defaultValue={editing.professionalUrl}
                  placeholder="https://www.linkedin.com/in/..."
                  className="focus-ring h-11 rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[rgb(var(--foreground))] md:col-span-2">
                Note
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={editing.notes}
                  className="focus-ring rounded-control border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-4 py-3 text-[rgb(var(--foreground))] outline-none focus:border-[rgb(var(--primary))]"
                />
              </label>
            </div>
            <label className="flex items-center gap-3 text-sm font-semibold text-[rgb(var(--foreground))]">
              <input
                name="isPrimary"
                type="checkbox"
                defaultChecked={editing.isPrimary || contacts.length === 0}
                className="focus-ring size-4 rounded border-[rgb(var(--border-strong))] bg-[rgb(var(--surface))] text-[rgb(var(--primary))]"
              />
              Contact principal pentru această oportunitate
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="focus-ring rounded-control bg-[rgb(var(--primary))] px-4 py-2 text-sm font-semibold text-[rgb(var(--primary-foreground))] transition-colors hover:bg-[rgb(var(--primary-hover))] disabled:opacity-60"
              >
                {isPending ? "Se salvează..." : editing.associationId ? "Salvează modificările" : "Salvează contact"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={isPending}
                className="focus-ring rounded-control border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--text-secondary))] transition-colors hover:border-[rgb(var(--border-strong))] hover:bg-[rgb(var(--surface-elevated))] hover:text-[rgb(var(--foreground))] disabled:opacity-60"
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
