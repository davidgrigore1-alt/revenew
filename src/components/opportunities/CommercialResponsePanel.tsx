"use client";

import { Select } from "@/components/ui/Select";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { DataCard } from "@/components/dashboard/DataCard";
import { Button } from "@/components/ui/Button";
import { StatusNotice } from "@/components/ui/StatusNotice";
import { useToast } from "@/components/ui/ToastProvider";
import { recordCommercialResponse } from "@/lib/commercial-response-actions";
import {
  commercialMilestones, getSuggestedNextAction, milestoneLabels, responseCategories, responseCategoryLabels,
  responseChannelLabels, responseChannels, type CommercialMilestone, type CommercialResponseCategory
} from "@/lib/commercial-response";
import { applicationDateKey } from "@/lib/opportunity-domain";
import type { Opportunity, OpportunityActionType } from "@/lib/types";
import { toUserFacingActionError } from "@/lib/user-facing-errors";
import { formatDateTimeWithSeconds } from "@/lib/utils";

const fieldClass = "h-11 w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 text-sm text-[rgb(var(--foreground))]";
const actionLabels: Record<OpportunityActionType, string> = {
  send_email: "Trimite email", call_contact: "Contactează persoana", prepare_offer: "Pregătește oferta",
  prepare_documents: "Pregătește materiale", follow_up: "Follow-up", apply_to_procurement: "Aplică la achiziție",
  apply_to_grant: "Aplică la grant", research_more: "Verifică și cercetează"
};

function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return applicationDateKey(date);
}

function FormLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return <span className="flex items-center justify-between gap-2"><span>{children}</span><span className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">{required ? "Obligatoriu" : "Opțional"}</span></span>;
}

export function CommercialResponsePanel({ opportunity }: { opportunity: Opportunity }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState<CommercialResponseCategory>("positive_interest");
  const initialSuggestion = getSuggestedNextAction(category);
  const [actionType, setActionType] = useState<OpportunityActionType>(initialSuggestion.type);
  const [actionTitle, setActionTitle] = useState<string>(initialSuggestion.title);
  const [dueDate, setDueDate] = useState(dateAfter(initialSuggestion.days));
  const [milestone, setMilestone] = useState<CommercialMilestone | "">(initialSuggestion.milestone ?? "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const responses = opportunity.responses ?? [];
  const primaryContact = opportunity.contacts?.find((contact) => contact.isPrimary)?.contactId ?? opportunity.contacts?.[0]?.contactId ?? "";
  const contactNames = useMemo(() => new Map((opportunity.contacts ?? []).map((association) => [association.contactId, association.contact.fullName])), [opportunity.contacts]);

  function changeCategory(next: CommercialResponseCategory) {
    setCategory(next);
    const suggestion = getSuggestedNextAction(next);
    setActionType(suggestion.type);
    setActionTitle(suggestion.title);
    setDueDate(dateAfter(suggestion.days));
    setMilestone(suggestion.milestone ?? "");
  }

  function submit(formData: FormData) {
    setError(""); setNotice("");
    startTransition(async () => {
      const result = await recordCommercialResponse(opportunity.id, {
        category, channel: String(formData.get("channel")) as "email", summary: String(formData.get("summary") ?? ""),
        respondedAt: String(formData.get("respondedAt") ?? ""), contactId: String(formData.get("contactId") ?? ""),
        sourceDocumentId: String(formData.get("sourceDocumentId") ?? ""), nextActionType: actionType,
        nextActionTitle: actionTitle, nextActionDueAt: dueDate, milestone
      });
      if (!result.ok) setError(toUserFacingActionError(result.error, "Răspunsul nu a putut fi înregistrat. Verifică datele și încearcă din nou.")); else {
        const message = "Răspunsul și următoarea acțiune au fost înregistrate. Acțiunea poate fi revizuită în Activitatea mea.";
        setNotice(message);
        showToast({ title: "Răspuns comercial înregistrat", description: message, tone: "success", action: { label: "Deschide Activitatea mea", href: "/today" } });
        router.refresh();
      }
    });
  }

  return <section id="commercial-response-loop" className="scroll-mt-24">
    <DataCard title="Răspuns comercial" description="Înregistrează manual răspunsul, confirmă următoarea acțiune și păstrează cronologia auditabilă.">
      <div className="grid gap-5">
        {opportunity.outreachRestrictedAt ? <StatusNotice tone="error">Outreach restricționat: {opportunity.outreachRestrictionReason === "unsubscribe" ? "dezabonare solicitată" : "adresa a fost respinsă"}. Nu iniția o nouă trimitere fără remediere controlată.</StatusNotice> : null}
        {notice ? <StatusNotice tone="success">{notice}</StatusNotice> : null}
        {error ? <StatusNotice tone="error">{error}</StatusNotice> : null}
        {opportunity.lifecycleStatus === "open" ? <form action={submit} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Categorie</FormLabel><Select value={category} onChange={(event) => changeCategory(event.target.value as CommercialResponseCategory)} className={fieldClass}>{responseCategories.map((value) => <option key={value} value={value}>{responseCategoryLabels[value]}</option>)}</Select></label>
            <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Canal</FormLabel><Select name="channel" defaultValue="email" className={fieldClass}>{responseChannels.map((value) => <option key={value} value={value}>{responseChannelLabels[value]}</option>)}</Select></label>
            <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Data răspunsului</FormLabel><input name="respondedAt" type="date" required defaultValue={applicationDateKey()} className={fieldClass} /></label>
            <label className="grid gap-2 text-sm font-semibold"><FormLabel>Contact</FormLabel><Select name="contactId" defaultValue={primaryContact} className={fieldClass}><option value="">Contact neconfirmat</option>{(opportunity.contacts ?? []).map((association) => <option key={association.contactId} value={association.contactId}>{association.contact.fullName}</option>)}</Select></label>
          </div>
          <label className="grid gap-2 text-sm font-semibold"><FormLabel>Rezumat răspuns</FormLabel><textarea name="summary" rows={3} maxLength={1200} placeholder={category === "no_response" ? "Se va salva o notă standard dacă rămâne gol." : "Ce a transmis contactul și ce contează comercial?"} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--background))] px-3 py-2" /></label>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Acțiune recomandată</FormLabel><Select value={actionType} onChange={(event) => setActionType(event.target.value as OpportunityActionType)} className={fieldClass}>{Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></label>
            <label className="grid gap-2 text-sm font-semibold xl:col-span-2"><FormLabel required>Titlu acțiune</FormLabel><input value={actionTitle} onChange={(event) => setActionTitle(event.target.value)} required maxLength={160} className={fieldClass} /></label>
            <label className="grid gap-2 text-sm font-semibold"><FormLabel required>Termen</FormLabel><input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required className={fieldClass} /></label>
          </div>
          <details className="group rounded-card border border-[rgb(var(--border))] bg-[rgb(var(--surface-subtle))]"><summary className="focus-ring flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-card px-4 py-2 text-sm font-semibold marker:hidden"><span>Detalii opționale <span className="font-normal text-[rgb(var(--text-muted))]">· milestone și dovadă asociată</span></span><span aria-hidden="true" className="text-[rgb(var(--primary))] transition-transform group-open:rotate-45">+</span></summary><div className="grid gap-4 border-t border-[rgb(var(--border))] p-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold"><FormLabel>Etapă comercială</FormLabel><Select value={milestone} onChange={(event) => setMilestone(event.target.value as CommercialMilestone | "")} className={fieldClass}><option value="">Fără etapă asociată</option>{commercialMilestones.map((value) => <option key={value} value={value}>{milestoneLabels[value]}</option>)}</Select></label>
            <label className="grid gap-2 text-sm font-semibold"><FormLabel>Document sursă</FormLabel><Select name="sourceDocumentId" defaultValue="" className={fieldClass}><option value="">Fără document asociat</option>{opportunity.documents.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</Select></label>
          </div></details>
          <div><Button type="submit" disabled={pending}>{pending ? "Se înregistrează..." : "Înregistrează răspuns"}</Button></div>
        </form> : <StatusNotice tone="neutral">Oportunitatea este închisă. Răspunsurile existente rămân disponibile în istoric.</StatusNotice>}

        <div className="grid gap-3"><h3 className="font-semibold">Răspunsuri înregistrate</h3>{responses.length ? responses.map((response) => <article key={response.id} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--surface-elevated))] p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-semibold">{responseCategoryLabels[response.category]} · {responseChannelLabels[response.channel]}</p><p className="text-xs text-[rgb(var(--muted-foreground))]">{formatDateTimeWithSeconds(response.respondedAt)}</p></div><p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">{response.summary}</p><p className="mt-2 text-xs">Contact: {response.contactId ? contactNames.get(response.contactId) ?? "Contact asociat" : "Neconfirmat"}{response.nextActionTitle ? ` · Următorul pas: ${response.nextActionTitle}` : ""}</p></article>) : <p className="text-sm text-[rgb(var(--muted-foreground))]">Nu există încă răspunsuri comerciale înregistrate.</p>}</div>
      </div>
    </DataCard>
  </section>;
}
